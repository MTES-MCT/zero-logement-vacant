import nodemailer from 'nodemailer';
import config from '../utils/config';

const transporter = nodemailer.createTransport({
    host: config.mailer.host,
    port: Number(config.mailer.port),
    secure: Boolean(config.mailer.secure),
    auth: {
        user: config.mailer.user,
        pass: config.mailer.password
    },
});

export const ActivationMail = (token: string) => `
    <a href="${config.application.host}/compte/activation/${token}">Cliquer ici pour activer votre compte</a>
`



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
