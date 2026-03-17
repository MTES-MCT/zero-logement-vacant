// @vitest-environment node
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

import { generateCampaignPDFInWorker } from '../../node.js';

describe('generateCampaignPDFInWorker', () => {
  it('should return a ReadableStream containing a valid PDF', async () => {
    const owner = genOwnerDTO();
    const housing = genHousingDTO();
    housing.owner = owner;
    const sender = genSenderDTO();
    const draft: DraftDTO = genDraftDTO(sender);
    const establishment = genEstablishmentDTO();
    const creator = genUserDTO(UserRole.USUAL, establishment);
    const group = genGroupDTO(creator, [housing]);
    const campaign = genCampaignDTO(group);

    const stream = await generateCampaignPDFInWorker({
      campaign,
      housings: [housing as HousingWithOwnerDTO],
      draft
    });

    expect(stream).toBeInstanceOf(ReadableStream);

    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    expect(buffer.toString('utf-8', 0, 4)).toBe('%PDF');
  }, 30_000);
});
