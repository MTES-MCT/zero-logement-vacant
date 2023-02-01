import createSendinblueService from '../sendinblueService';
import { genSignupLinkApi } from '../../../test/testFixtures';
import { getAccountActivationLink } from '../../../models/SignupLinkApi';

describe.skip('Sendinblue service', () => {
  const mailService = createSendinblueService();

  // const delay = (ms: number) =>
  //   new Promise((resolve) => setTimeout(resolve, ms));

  it('should emit an event', async () => {
    const link = genSignupLinkApi('andrea.gueugnaut@gmail.com');

    mailService.emit('prospect:initialized', 'andrea.gueugnaut@gmail.com', {
      link: getAccountActivationLink(link.id),
    });
  });
});
