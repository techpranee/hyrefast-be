/** 
 * smsService.js
 * @description :: exports function used in sending sms using aws sns provider
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const aws = require('@aws-sdk/client-sns');

const sendSMS = async (obj) => {
    const PublishCommand = aws.PublishCommand;
    const SNSClient = aws.SNSClient;
    const snsClient = new SNSClient({ region: process.env.AWS_SNS_REGION });
    let recipients = [];
    if (Array.isArray(obj.to)) {
        recipients = recipients.concat(obj.to);
    } else if (typeof obj.to === 'string') {
        const mobileArray = obj.to.split(',');
        recipients = recipients.concat(mobileArray);
    }
    for (let i = 0; i < recipients.length; i++) {
        const params = {
            Message: obj.text /* required */,
            PhoneNumber: recipients[i], //PHONE_NUMBER, in the E.164 phone number structure
        };
        await snsClient.send(new PublishCommand(params));
    };
};
module.exports = { sendSMS } 