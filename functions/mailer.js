const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

const config = functions.config();
const apiKey = config.sendgrid?.api_key;
const fromEmail = config.sendgrid?.from;

if (apiKey) {
  sgMail.setApiKey(apiKey);
} else {
  console.warn('SendGrid API key is not configured.');
}

function ensureConfigured() {
  if (!apiKey) {
    throw new Error('SendGrid API key is not configured');
  }

  if (!fromEmail) {
    throw new Error('SendGrid "from" email is not configured');
  }
}

async function sendVerificationEmail({ to, link }) {
  if (!to) {
    throw new Error('Missing "to" address for verification email');
  }

  if (!link) {
    throw new Error('Missing verification link');
  }

  ensureConfigured();

  const message = {
    to,
    from: fromEmail,
    subject: 'Verify your email address',
    text: `Please verify your email address by visiting: ${link}`,
    html: `\n      <p>Please verify your email address by clicking the link below:</p>\n      <p><a href="${link}">Verify Email Address</a></p>\n    `,
  };

  await sgMail.send(message);
}

module.exports = { sendVerificationEmail };
