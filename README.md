#SNS deduplication sample!

This projects creates a ApiGateway connected to SNS and a Lambda function.

SNS has deduplication by content. So only the first message with the same content will be delivered.

## Useful commands
 * `cdk bootstrap`: Initialize the CDK toolkit.
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk destroy`     delete this stack

Once you have the stack deployed, you can test the function by sending a message to the topic.

`curl -GET http://apigatewayUlr/prod/queue?message=HeyIWontBeDuplicated`

If you call this curl command many times, the lambda will be triggered only once. You can see the message in the logs.