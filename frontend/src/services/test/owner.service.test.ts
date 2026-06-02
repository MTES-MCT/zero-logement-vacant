import { describe, expect, it } from 'vitest';

import { genOwnerDTO } from '@zerologementvacant/models/fixtures';
import { parseOwner } from '../owner.service';

describe('parseOwner', () => {
  it('uses username directly when set, skipping fullName formatting', () => {
    const owner = {
      ...genOwnerDTO(),
      fullName: 'MME DUPONT MARIE',
      username: 'Marie Dupont'
    };

    const result = parseOwner(owner);

    expect(result.fullName).toBe('Marie Dupont');
  });

  it('falls back to formatted fullName when username is null', () => {
    const owner = {
      ...genOwnerDTO(),
      fullName: 'MME DUPONT MARIE',
      username: null
    };

    const result = parseOwner(owner);

    expect(result.fullName).toBe('Dupont Marie');
  });
});
