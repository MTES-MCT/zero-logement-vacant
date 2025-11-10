import nodemailer from 'nodemailer';

import config from '~/infra/config';
import { logger } from '~/infra/logger';
import { UserApi } from '~/models/UserApi';
import { MailEvent, MailService, SendOptions } from './mailService';

class NodemailerService implements MailService {
  private transport: nodemailer.Transporter<nodemailer.SentMessageInfo>;

  constructor() {
    this.transport = nodemailer.createTransport({
      host: config.mailer.host ?? undefined,
      port: config.mailer.port ?? undefined,
      secure: config.mailer.secure ?? undefined,
      auth: {
        user: config.mailer.user ?? undefined,
        pass: config.mailer.password ?? undefined
      }
    });
  }

  emit<E extends keyof MailEvent>(
    event: E,
    email: string,
    data?: Partial<MailEvent[E]>
  ) {
    logger.info('Emit mail event', {
      event,
      email,
      data
    });
  }

  async send(options: SendOptions): Promise<void> {
    return this.transport.sendMail({
      from: config.mailer.from,
      to: options.recipients.join(','),
      subject: options.subject,
      html: options.content
    });
  }

  async sendPasswordReset(key: string, options: SendOptions): Promise<void> {
    return this.send({
      ...options,
      subject: 'Réinitialisation du mot de passe',
      content: `Cliquez sur le lien ${config.app.host}/mot-de-passe/nouveau#${key}`
    });
  }

  async sendAccountActivationEmail(
    key: string,
    options: SendOptions
  ): Promise<void> {
    return this.send({
      ...options,
      subject: 'Activation du compte',
      content: `Cliquez sur le lien ${config.app.host}/inscription/mot-de-passe#${key}`
    });
  }

  async sendAccountActivationEmailFromLovac(
    key: string,
    options: SendOptions
  ): Promise<void> {
    return this.send({
      ...options,
      subject: 'Activation du compte',
      content: `Suite à la validation de votre accès aux données LOVAC. Cliquez sur le lien ${config.app.host}/inscription/mot-de-passe#${key}`
    });
  }

  async sendOwnerProspectCreatedEmail(users: UserApi[]): Promise<void> {
    return this.send({
      subject: 'Nouveau message - Boite de réception',
      recipients: users.map((user) => user.email),
      content: 'Nouveau message'
    });
  }

  async sendTwoFactorCode(code: string, options: SendOptions): Promise<void> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #000091; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 30px; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px;
                    background-color: white; padding: 20px; margin: 20px 0; border: 2px solid #000091; }
            .footer { text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Zéro Logement Vacant</h1>
            </div>
            <div class="content">
              <h2>Code de vérification pour la connexion</h2>
              <p>Votre code de vérification à usage unique est :</p>
              <div class="code">${code}</div>
              <p>Ce code est valable pendant <strong>5 minutes</strong>.</p>
              <p><strong>Attention :</strong> Après 3 tentatives infructueuses, votre compte sera verrouillé pendant 15 minutes.</p>
              <p>Si vous n'avez pas demandé ce code, veuillez ignorer cet email.</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              <p>&copy; ${new Date().getFullYear()} Zéro Logement Vacant</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      ...options,
      subject: 'Code de vérification - Zéro Logement Vacant',
      content: htmlContent
    });
  }
}

export default function createNodemailerService(): MailService {
  return new NodemailerService();
}
