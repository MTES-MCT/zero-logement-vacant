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
Bonjour, 
<p>
    Vous trouverez ci-dessous le lien pour activer votre compte d’accès à la solution logicielle de Zéro Logement Vacant.
</p>
<p>
    <a href="${config.application.host}/compte/activation/${token}">Cliquer ici pour activer votre compte</a>
</p> 
<p>
    En vous souhaitant une bonne utilisation,
</p>
<p>
Toute l’équipe Zéro Logement Vacant    
</p>
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
