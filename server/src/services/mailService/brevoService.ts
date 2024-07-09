import { ContactsApi, TransactionalEmailsApi } from '@sendinblue/client';
import { sibTracker as EventsApi } from '@wecre8websites/sendinblue-tracker';
// TODO: remove custom types when it will be officially supported.
// See https://github.com/getbrevo/brevo-node/issues/1
import Brevo from '@getbrevo/brevo';

import { MailEvent, MailService, SendOptions } from './mailService';
import config from '~/infra/config';
import { getAccountActivationLink } from '~/models/SignupLinkApi';
import { getPasswordResetLink } from '~/models/ResetLinkApi';
import { UserApi } from '~/models/UserApi';
import { logger } from '~/infra/logger';

const PASSWORD_RESET_TEMPLATE_ID = 8;
const ACCOUNT_ACTIVATION_TEMPLATE_ID = 5;
const LOVAC_ACCOUNT_ACTIVATION_TEMPLATE_ID = 54;
const OWNER_PROSPECT_CREATED_TEMPLATE_ID = 13;

class BrevoService implements MailService {
  private emails: TransactionalEmailsApi;
  private contacts: ContactsApi;
  private events: EventsApi;

  constructor() {
    if (!config.mailer.apiKey) {
      throw new Error('Provide an API key for Sendinblue');
    }

    const client = Brevo.ApiClient.instance;
    client.authentications['api-key'].apiKey = config.mailer.apiKey;

    this.emails = new Brevo.TransactionalEmailsApi();
    this.contacts = new Brevo.ContactsApi();

    // FIXME
    this.events = new EventsApi(config.mailer.eventApiKey as string);
  }

  emit<E extends keyof MailEvent>(event: E, email: string, data: MailEvent[E]) {
    switch (event) {
      case 'housing:exported':
        return this.housingExported(
          email,
          data as MailEvent['housing:exported'],
        );
      case 'owner-prospect:created':
        return this.ownerProspectCreated(email);
      case 'prospect:initialized':
        return this.prospectInitialized(
          email,
          data as MailEvent['prospect:initialized'],
        );
      case 'user:created':
        return this.prospectActivated(email, data as MailEvent['user:created']);
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
    options: SendOptions,
  ): Promise<void> {
    await this.send({
      ...options,
      templateId: ACCOUNT_ACTIVATION_TEMPLATE_ID,
      params: {
        link: getAccountActivationLink(key),
      },
    });
  }

  async sendAccountActivationEmailFromLovac(
    key: string,
    options: SendOptions,
  ): Promise<void> {
    await this.send({
      ...options,
      templateId: LOVAC_ACCOUNT_ACTIVATION_TEMPLATE_ID,
      params: {
        link: getAccountActivationLink(key),
      },
    });
  }

  async sendOwnerProspectCreatedEmail(users: UserApi[]): Promise<void> {
    await this.send({
      templateId: OWNER_PROSPECT_CREATED_TEMPLATE_ID,
      recipients: users.map((user) => user.email),
    });
  }

  private housingExported(email: string, data: MailEvent['housing:exported']) {
    this.events
      .trackEvent(email, 'housing:exported', {
        priority: data.priority,
      })
      .catch(logger.error);
  }

  private ownerProspectCreated(email: string) {
    this.events.trackEvent(email, 'owner-prospect:created').catch(logger.error);
  }

  private prospectInitialized(
    email: string,
    data: MailEvent['prospect:initialized'],
  ) {
    this.contacts
      .getContactInfo(email)
      .then(() => {
        logger.info('Contact exists. Skipping...', { email });
      })
      .catch((error) => {
        logger.error(error);
        return this.contacts.createContact({
          email,
          attributes: {
            EMAIL_VALIDE: false,
            SIGNUP_LINK: data.link,
          },
        });
      })
      .catch(logger.error.bind(logger));
  }

  private prospectActivated(email: string, data: MailEvent['user:created']) {
    this.contacts
      .updateContact(email, {
        attributes: {
          DATE_ACTIVATION: data.createdAt,
          EMAIL_VALIDE: true,
        },
      })
      .then(() => this.events.trackEvent(email, 'user:created'))
      .catch(logger.error);
  }
}

export default function createSendinblueService(): MailService {
  return new BrevoService();
}
