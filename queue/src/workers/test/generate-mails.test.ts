import { faker } from '@faker-js/faker/locale/fr';

import { createQueue } from '../../queue';
import {
  Establishments,
  formatEstablishmentApi,
} from '../../../../server/repositories/establishmentRepository';
import { genEstablishmentApi } from '../../../../server/test/testFixtures';
import { QueueEvents } from 'bullmq';

describe('Generate mails', () => {
  const queue = createQueue();

  const establishment = genEstablishmentApi();

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
  });

  it('should fail if the campaign is missing', async () => {
    const events = new QueueEvents('campaign:generate');

    events.on('failed', ({ jobId }) => {
      expect(jobId).toBe('campaign:generate');
    });

    await queue.add('campaign:generate', {
      campaignId: faker.string.uuid(),
      establishmentId: establishment.id,
    });
  });

  it.todo('should fail if the draft is missing');

  it.todo('should save the file URL in the campaign');
});
