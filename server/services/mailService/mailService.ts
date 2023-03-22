import { EstablishmentPriority } from '../../models/EstablishmentApi';

export type TemplateId = string | number;

export interface SendOptions {
  recipients: string[];
  subject?: string;
  content?: string;
  templateId?: TemplateId;
  params?: any;
}

export interface MailService {
  emit<E extends keyof MailEvent>(
    event: E,
    email: string,
    data?: Partial<MailEvent[E]>
  ): void;
  send(options: SendOptions): Promise<void>;
  sendPasswordReset(key: string, options: SendOptions): Promise<void>;
  sendAccountActivationEmail(key: string, options: SendOptions): Promise<void>;
}

export interface MailEvent {
  'housing:exported': { priority: EstablishmentPriority };
  'owner-prospect:created': Record<string, never>;
  'prospect:initialized': { link: string };
  'prospect:activated': { createdAt: Date };
}
