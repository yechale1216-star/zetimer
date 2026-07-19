const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const secure = process.env.SMTP_SECURE === 'true'; // will be false if it's set to "false"
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

console.log('Testing SMTP connection with:');
console.log('Host:', host);
console.log('Port:', port);
console.log('User:', user);
console.log('Secure:', secure);

const transporter = nodemailer.createTransport({
  host: host,
  port: port,
  secure: secure,
  auth: {
    user: user,
    pass: pass,
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function runTest() {
  try {
    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('Transporter is verified!');

    const mailOptions = {
      from: `"Zetime Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self
      subject: 'SMTP Test Email',
      text: 'This is a test email to verify SMTP configuration.',
    };

    console.log('Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('SMTP Error:', error);
  }
}

runTest();
