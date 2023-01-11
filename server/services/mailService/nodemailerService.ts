import { MailService, SendOptions } from './mailService';
import nodemailer from 'nodemailer';
import config from '../../utils/config';

class NodemailerService implements MailService {
  private transport: nodemailer.Transporter<nodemailer.SentMessageInfo>;

  constructor() {
    this.transport = nodemailer.createTransport({
      host: config.mailer.host ?? undefined,
      port: config.mailer.port ?? undefined,
      secure: config.mailer.secure ?? undefined,
      auth: {
        user: config.mailer.user ?? undefined,
        pass: config.mailer.password ?? undefined,
      },
    });
  }

  async send(options: SendOptions): Promise<void> {
    return this.transport.sendMail({
      from: config.mail.from,
      to: options.recipients.join(','),
      subject: options.subject,
      html: options.content,
    });
  }

  async sendPasswordReset(key: string, options: SendOptions): Promise<void> {
    return this.send({
      ...options,
      subject: 'Réinitialisation du mot de passe',
      content: `Cliquez sur le lien ${config.application.host}/mot-de-passe/nouveau#${key}`,
    });
  }

  async sendAccountActivationEmail(
    key: string,
    options: SendOptions
  ): Promise<void> {
    return this.send({
      ...options,
      subject: 'Activation du compte',
      content: `Cliquez sur le lien ${config.application.host}/inscription/mot-de-passe#${key}`,
    });
  }
}

export default function createNodemailerService(): MailService {
  return new NodemailerService();
}
