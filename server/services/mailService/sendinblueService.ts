import {
  ContactsApi,
  ContactsApiApiKeys,
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from '@sendinblue/client';
import { sibTracker as EventsApi } from '@wecre8websites/sendinblue-tracker';

import { MailEvent, MailService, SendOptions } from './mailService';
import config from '../../utils/config';
import { getAccountActivationLink } from '../../models/SignupLinkApi';
import { getPasswordResetLink } from '../../models/ResetLinkApi';

const PASSWORD_RESET_TEMPLATE_ID = 8;
const ACCOUNT_ACTIVATION_TEMPLATE_ID = 5;

class SendinblueService implements MailService {
  private emails: TransactionalEmailsApi;
  private contacts: ContactsApi;
  private events: EventsApi;

  constructor() {
    this.emails = new TransactionalEmailsApi();
    this.emails.setApiKey(
      TransactionalEmailsApiApiKeys.apiKey,
      config.mailer.apiKey as string
    );
    this.contacts = new ContactsApi();
    this.contacts.setApiKey(
      ContactsApiApiKeys.apiKey,
      config.mailer.apiKey as string
    );
    this.events = new EventsApi(config.mailer.apiKey as string);
  }

  emit<E extends keyof MailEvent>(event: E, email: string, data: MailEvent[E]) {
    switch (event) {
      case 'housing:exported':
        return this.housingExported(
          email,
          data as MailEvent['housing:exported']
        );
      case 'prospect:initialized':
        return this.prospectInitialized(
          email,
          data as MailEvent['prospect:initialized']
        );
      case 'prospect:activated':
        return this.prospectActivated(
          email,
          data as MailEvent['prospect:activated']
        );
    }
  }

  async send(options: SendOptions): Promise<void> {
    await this.emails.sendTransacEmail({
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
        link: getPasswordResetLink(key),
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
        link: getAccountActivationLink(key),
      },
    });
  }

  private housingExported(email: string, data: MailEvent['housing:exported']) {
    this.events
      .trackEvent(email, 'housing:exported', {
        priority: data.priority ?? 'normal',
      })
      .catch(console.error);
  }

  private prospectInitialized(
    email: string,
    data: MailEvent['prospect:initialized']
  ) {
    this.contacts
      .getContactInfo(email)
      .catch((error) => {
        console.error(error);
        return this.contacts.createContact({
          email,
          attributes: {
            EMAIL_VALIDE: false,
            SIGNUP_LINK: data.link,
          },
        });
      })
      .catch(console.error);
  }

  private prospectActivated(
    email: string,
    data: MailEvent['prospect:activated']
  ) {
    this.contacts
      .updateContact(email, {
        attributes: {
          DATE_ACTIVATION: data.createdAt,
          EMAIL_VALIDE: true,
        },
      })
      .catch(console.error);
  }
}

export default function createSendinblueService(): MailService {
  if (!config.mailer.apiKey) {
    throw new Error('Provide an API key for Sendinblue');
  }
  return new SendinblueService();
}
