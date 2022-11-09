import nodemailer from 'nodemailer';
import config from '../utils/config';

const transporter = nodemailer.createTransport({
    host: config.mailer.host,
    port: config.mailer.port,
    secure: config.mailer.secure,
    auth: {
        user: config.mailer.user,
        pass: config.mailer.password
    },
});


const sendMail = async (subject: string, content: string, recipients: string[]): Promise<any> => {

    return transporter.sendMail({
        from: config.mail.from,
        to: recipients.join(','),
        subject: subject,
        html: content
    })
}


export default {
    sendMail
}
