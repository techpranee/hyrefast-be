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

const sendMail = async (obj) => {
  if (!Array.isArray(obj.to)) {
    obj.to = [obj.to];
  }

  let htmlText = '';
  
  // Handle HTML content directly (NEW)
  if (obj.html) {
    htmlText = obj.html;
  } 
  // Handle template rendering (EXISTING)
  else if (obj.template) {
    htmlText = await ejs.renderFile(`${__basedir}${obj.template}/html.ejs`, obj.data || null);
  }
  // Handle plain text fallback
  else if (obj.text) {
    htmlText = `<p>${obj.text}</p>`;
  }

  let mailOpts = {
    from: obj.from || 'hyrefast@techpranee.com',
    subject: obj.subject || 'Sample Subject',
    to: obj.to,
    cc: obj.cc || [],
    bcc: obj.bcc || [],
    html: htmlText,
    text: obj.text || '', // Always include text fallback
    attachments: obj.attachments || []
  };

  // Debug logging to verify content
  console.log('Email HTML content length:', htmlText.length);
  console.log('Email HTML preview:', htmlText.substring(0, 200) + '...');

  return transporter.sendMail(mailOpts);
};

module.exports = { sendMail };
