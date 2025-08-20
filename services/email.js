const nodemailer = require('nodemailer');
const ejs = require('ejs');

const sesTransport = require('nodemailer-ses-transport');
const AWSCredentials = {
  accessKeyId: process.env.AWS_SES_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SES_SECRET_KEY,
  region: process.env.AWS_SES_REGION
};
const transporter = nodemailer.createTransport(sesTransport({
  accessKeyId: AWSCredentials.accessKeyId,
  secretAccessKey: AWSCredentials.secretAccessKey,
  region: AWSCredentials.region,
}));

const sendMail =  async (obj) => {
  if (!Array.isArray(obj.to)) {
    obj.to = [obj.to];
  }

  let htmlText = '';
  if (obj.template){
    htmlText = await ejs.renderFile(`${__basedir}${obj.template}/html.ejs`, obj.data || null);
  }

  let mailOpts = {
    from: obj.from || 'noreply@yoyo.co',
    subject: obj.subject || 'Sample Subject',
    to: obj.to,
    cc: obj.cc || [],
    bcc: obj.bcc || [],
    html: htmlText,
    attachments: obj.attachments || []
  };
  return transporter.sendMail(mailOpts);
};

module.exports = { sendMail };