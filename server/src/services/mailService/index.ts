import config from '~/infra/config';
import createSendinblueService from './brevoService';
import { MailService } from './mailService';
import createNodemailerService from './nodemailerService';

const mailService: MailService =
  config.mailer.provider === 'brevo'
    ? createSendinblueService()
    : createNodemailerService();

export default mailService;
