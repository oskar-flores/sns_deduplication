import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import * as path from "path";
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import {NodejsFunction} from '@aws-cdk/aws-lambda-nodejs';
import * as iam from '@aws-cdk/aws-iam';
import * as apigateway from '@aws-cdk/aws-apigateway';

export class SnsDeduplicationStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const queue = new sqs.Queue(this, 'Queue', {
      queueName: 'oskar-deduplication.fifo',
      visibilityTimeout: cdk.Duration.seconds(300),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      fifo: true,
      contentBasedDeduplication: true,
    });

    //M Role that can be assumed by the apigateway.amazonaws.com principle and grants access to use the sqs:SendMessage
    // action for the created queue.
    const credentialsRole = new iam.Role(this, "Role", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    credentialsRole.attachInlinePolicy(
        new iam.Policy(this, "SendMessagePolicy", {
          statements: [
            new iam.PolicyStatement({
              actions: ["sqs:SendMessage"],
              effect: iam.Effect.ALLOW,
              resources: [queue.queueArn],
            }),
          ],
        })
    );

    const api = new apigateway.RestApi(this, "Endpoint");


    const resourceQueue = api.root.addResource("queue");
    resourceQueue.addMethod(
        "GET",
        new apigateway.AwsIntegration({
          service: "sqs",
          path: `${cdk.Aws.ACCOUNT_ID}/${queue.queueName}`,
          integrationHttpMethod: "POST",
          options: {
            credentialsRole,
            passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
            requestParameters: {
              "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`,
            },
            requestTemplates: {
              "application/json": `Action=SendMessage&MessageGroupId=group1&MessageBody=$util.urlEncode("$method.request.querystring.message")`,
            },
            integrationResponses: [
              {
                statusCode: "200",
                responseTemplates: {
                  "application/json": `{"done": true}`,
                },
              },
            ],
          },
        }),
        { methodResponses: [{ statusCode: "200" }] });
    // 👇 create lambda function
    const myLambda = new NodejsFunction(this, 'my-lambda', {
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, `../src/lambda/handler.ts`),
    });

    // 👇 add sqs queue as event source for lambda
    const eventSource = new lambdaEventSources.SqsEventSource(queue);
    myLambda.addEventSource(eventSource);
  }
}
