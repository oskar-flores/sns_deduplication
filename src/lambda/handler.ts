export const handler = async (event: any, context: any) => {
    console.log(`event ${JSON.stringify(event)} at ${new Date().toISOString()}`);
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Go Serverless v1.0! Your function executed successfully!',
            input: event,
        }),
    };
};