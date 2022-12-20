import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from '@sendinblue/client';

import { MailService, SendOptions } from './mailService';
import config from '../../utils/config';

const PASSWORD_RESET_TEMPLATE_ID = 8;

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
    await this.client.sendTestTemplate(Number(options.templateId), {
      emailTo: options.recipients,
    });
  }

  async sendPasswordReset(key: string, options: SendOptions): Promise<void> {
    await this.send({
      ...options,
      templateId: PASSWORD_RESET_TEMPLATE_ID,
    });
  }
}

export default function createSendinblueService(): MailService {
  if (!config.mailer.apiKey) {
    throw new Error('Provide an API key for Sendinblue');
  }
  return new SendinblueService();
}
