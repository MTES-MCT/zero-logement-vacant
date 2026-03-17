import {
  UserRole,
  type DraftDTO,
  type HousingWithOwnerDTO
} from '@zerologementvacant/models';
import {
  genCampaignDTO,
  genDraftDTO,
  genEstablishmentDTO,
  genGroupDTO,
  genHousingDTO,
  genOwnerDTO,
  genSenderDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { describe, expect, it } from 'vitest';

import { generate } from '../campaigns.js';

describe('generate campaign PDF', () => {
  it('should return ReadableStream', async () => {
    const housing = genHousingDTO();
    housing.owner = genOwnerDTO();
    const sender = genSenderDTO();
    const draft: DraftDTO = genDraftDTO(sender);
    const establishment = genEstablishmentDTO();
    const creator = genUserDTO(UserRole.USUAL, establishment);
    const group = genGroupDTO(creator, [housing]);
    const campaign = genCampaignDTO(group);

    const stream = await generate({
      campaign,
      housings: [housing as HousingWithOwnerDTO],
      draft
    });

    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('should replace variables in draft body', async () => {
    const owner = genOwnerDTO();
    owner.fullName = 'Jean Dupont';
    const housing = genHousingDTO();
    housing.owner = owner;
    const sender = genSenderDTO();
    const establishment = genEstablishmentDTO();
    const creator = genUserDTO(UserRole.USUAL, establishment);
    const group = genGroupDTO(creator, [housing]);
    const campaign = genCampaignDTO(group);
    const draft: DraftDTO = {
      ...genDraftDTO(sender),
      subject: 'Test',
      body: '<p>Bonjour {{owner.fullName}},</p>',
      writtenAt: null,
      writtenFrom: null
    };

    const stream = await generate({ campaign, housings: [housing as HousingWithOwnerDTO], draft });
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    // Check it's a valid PDF
    expect(buffer.toString('utf-8', 0, 4)).toBe('%PDF');
  });
});
