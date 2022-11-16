import nodemailer from 'nodemailer';
import config from '../utils/config';

const transporter = nodemailer.createTransport({
    host: config.mailer.host ?? undefined,
    port: config.mailer.port ?? undefined,
    secure: config.mailer.secure ?? undefined,
    auth: {
        user: config.mailer.user ?? undefined,
        pass: config.mailer.password ?? undefined
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
