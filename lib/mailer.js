const nodemailer = require('nodemailer');

const logger = require('./logger');

const mailer = process.env.MAILER_STRATEGY || 'ses';
let activeTransporter;

// transporter object with password authenticated google smtp mailer
const transporterSMTP = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GOOGLE_USER,
        pass: process.env.GOOGLE_PASS
    }
})

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        type: 'OAuth2',
        user: process.env.MAILER_USER,
        clientId: process.env.GOOGLE_MAILER_CLIENT_ID,
        clientSecret: process.env.GOOGLE_MAILER_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN
    }
});

// transporter object with password authenticated Amazon SES smtp mailer
const transporterSES = nodemailer.createTransport({
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    encryption: 'TLS',
    secure: false,
    auth: {
        user: process.env.SES_MAILER_ID,
        pass: process.env.SES_MAILER_SECRET
    }
})

switch (mailer) {
    case 'gmail':
        activeTransporter = transporterSMTP;
        break;
    case 'oauth2':
        activeTransporter = transporter;
        break;
    case 'ses':
        activeTransporter = transporterSES;
        break;
    default:
        activeTransporter = transporterSES
        break;
}

const send = (to, subject, body) => {
    const mailOptions = {
        from: process.env.MAILER_USER,
        to,
        subject,
        html: body
    };

    return new Promise((ok, fail) => {
        activeTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                logger.error(error);
                return fail(error);
            }
            logger.log(JSON.stringify(info));
            return ok(info);
        });
    });
}

module.exports = send;