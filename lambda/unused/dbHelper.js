var AWS = require('aws-sdk');

async function createDB() {
    const STS = new AWS.STS({ apiVersion: '2011-06-15' });
    const credentials = await STS.assumeRole({
        RoleArn: 'arn:aws:iam::020485550387:role/311DynamoDB',
        RoleSessionName: '311ddbSession' // You can rename with any name
    },
        (err, res) => {
            if (err) {
                console.log('AssumeRole FAILED: ', err);
                throw new Error('Error while assuming role');
            }
            return res;
        }).promise();

    return credentials;
}

// // 2. Make a new DynamoDB instance with the assumed role credentials
// //    and scan the DynamoDB table
// const dynamoDB = new AWS.DynamoDB({
//     apiVersion: 'latest',
//     region: 'us-east-1',
//     accessKeyId: credentials.Credentials.AccessKeyId,
//     secretAccessKey: credentials.Credentials.SecretAccessKey,
//     sessionToken: credentials.Credentials.SessionToken
// });
// const tableData = await dynamoDB.scan({ TableName: 'sac311table' }, (err, data) => {
//     if (err) {
//         console.log('Scan FAILED', err);
//         throw new Error('Error while scanning table');
//     }
//     return data;
// }).promise();

// // ... Use table data as required ...

module.exports = {
    credentials: async () => {
        let creds = await createDB()
        return creds;
    }
}