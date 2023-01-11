import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from '@sendinblue/client';

import { MailService, SendOptions } from './mailService';
import config from '../../utils/config';

const PASSWORD_RESET_TEMPLATE_ID = 8;
const ACCOUNT_ACTIVATION_TEMPLATE_ID = 5;

class SendinblueService implements MailService {
  private client: TransactionalEmailsApi;

  constructor() {
    this.client = new TransactionalEmailsApi();
    this.client.setApiKey(
      TransactionalEmailsApiApiKeys.apiKey,
      config.mailer.apiKey as string
    );
  }

  async send(options: SendOptions): Promise<void> {
    await this.client.sendTransacEmail({
      ...options,
      templateId: Number(options.templateId),
      to: options.recipients.map((recipient) => ({
        email: recipient,
      })),
    });
  }

  async sendPasswordReset(key: string, options: SendOptions): Promise<void> {
    await this.send({
      ...options,
      templateId: PASSWORD_RESET_TEMPLATE_ID,
      params: {
        link: `${config.application.host}/mot-de-passe/nouveau#${key}`,
      },
    });
  }

  async sendAccountActivationEmail(
    key: string,
    options: SendOptions
  ): Promise<void> {
    await this.send({
      ...options,
      templateId: ACCOUNT_ACTIVATION_TEMPLATE_ID,
      params: {
        link: `${config.application.host}/inscription/mot-de-passe#${key}`,
      },
    });
  }
}

export default function createSendinblueService(): MailService {
  if (!config.mailer.apiKey) {
    throw new Error('Provide an API key for Sendinblue');
  }
  return new SendinblueService();
}
