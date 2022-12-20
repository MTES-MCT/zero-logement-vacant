import config from '../../utils/config';
import createSendinblueService from './sendinblueService';
import { MailService } from './mailService';
import createNodemailerService from './nodemailerService';

const mailService: MailService =
  config.mailer.provider === 'sendinblue'
    ? createSendinblueService()
    : createNodemailerService();

export default mailService;
