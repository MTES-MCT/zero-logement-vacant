export type TemplateId = string | number;

export interface SendOptions {
  recipients: string[];
  subject?: string;
  content?: string;
  templateId?: TemplateId;
}

export interface MailService {
  send(options: SendOptions): Promise<void>;
  sendPasswordReset(key: string, options: SendOptions): Promise<void>;
}
