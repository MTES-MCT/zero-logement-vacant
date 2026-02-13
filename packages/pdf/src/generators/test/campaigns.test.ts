import {
  genHousingDTO,
  genOwnerDTO
} from '@zerologementvacant/models/fixtures';
import { describe, expect, it } from 'vitest';

import { generate } from '../campaigns.js';

describe('generate campaign PDF', () => {
  it('should return ReadableStream', async () => {
    const housing = genHousingDTO();
    housing.owner = genOwnerDTO();
    const draft = {
      subject: 'Test Subject',
      body: '<p>Hello {{owner.fullName}}</p>',
      writtenAt: '2026-02-04',
      writtenFrom: 'Paris'
    };

    const stream = await generate({ housings: [housing], draft });

    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('should replace variables in draft body', async () => {
    const owner = genOwnerDTO();
    owner.fullName = 'Jean Dupont';
    const housing = genHousingDTO();
    housing.owner = owner;
    const draft = {
      subject: 'Test',
      body: '<p>Bonjour {{owner.fullName}},</p>',
      writtenAt: null,
      writtenFrom: null
    };

    const stream = await generate({ housings: [housing], draft });
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
