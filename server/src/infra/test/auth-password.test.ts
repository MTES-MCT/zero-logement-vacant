import bcrypt from 'bcryptjs';
import { hashPassword as scryptHash } from 'better-auth/crypto';
import { describe, expect, it, vi } from 'vitest';

import { createPasswordVerifier } from '../auth-password';

const PLAINTEXT = 'correct-horse-battery-staple';
const WRONG = 'tr0ub4dor&3';

describe('createPasswordVerifier', () => {
  it('verifies a legacy bcrypt hash', async () => {
    const verify = createPasswordVerifier({ rehash: null });
    const hash = await bcrypt.hash(PLAINTEXT, 10);

    await expect(verify({ hash, password: PLAINTEXT })).resolves.toBe(true);
    await expect(verify({ hash, password: WRONG })).resolves.toBe(false);
  });

  it('verifies a new better-auth (scrypt) hash', async () => {
    const verify = createPasswordVerifier({ rehash: null });
    const hash = await scryptHash(PLAINTEXT);

    await expect(verify({ hash, password: PLAINTEXT })).resolves.toBe(true);
    await expect(verify({ hash, password: WRONG })).resolves.toBe(false);
  });

  it('accepts $2a$, $2b$, $2y$ bcrypt variants', async () => {
    const verify = createPasswordVerifier({ rehash: null });
    // bcryptjs always produces $2a$; build $2b$ and $2y$ variants by
    // mutating the prefix — they are byte-compatible.
    const baseHash = await bcrypt.hash(PLAINTEXT, 10);
    const variants = [
      baseHash,
      baseHash.replace(/^\$2a\$/, '$2b$'),
      baseHash.replace(/^\$2a\$/, '$2y$')
    ];

    for (const hash of variants) {
      await expect(verify({ hash, password: PLAINTEXT })).resolves.toBe(true);
    }
  });

  it('triggers rehash after a successful bcrypt verify', async () => {
    const rehash = vi.fn().mockResolvedValue(undefined);
    const verify = createPasswordVerifier({ rehash });
    const hash = await bcrypt.hash(PLAINTEXT, 10);

    await verify({ hash, password: PLAINTEXT });

    expect(rehash).toHaveBeenCalledTimes(1);
    expect(rehash).toHaveBeenCalledWith({
      previousHash: hash,
      password: PLAINTEXT
    });
  });

  it('does not trigger rehash on bcrypt verify failure', async () => {
    const rehash = vi.fn();
    const verify = createPasswordVerifier({ rehash });
    const hash = await bcrypt.hash(PLAINTEXT, 10);

    await verify({ hash, password: WRONG });

    expect(rehash).not.toHaveBeenCalled();
  });

  it('does not trigger rehash on scrypt verify (already in target format)', async () => {
    const rehash = vi.fn();
    const verify = createPasswordVerifier({ rehash });
    const hash = await scryptHash(PLAINTEXT);

    await verify({ hash, password: PLAINTEXT });

    expect(rehash).not.toHaveBeenCalled();
  });

  it('swallows rehash errors so a transient DB failure does not break login', async () => {
    const rehash = vi.fn().mockRejectedValue(new Error('db down'));
    const verify = createPasswordVerifier({ rehash });
    const hash = await bcrypt.hash(PLAINTEXT, 10);

    await expect(verify({ hash, password: PLAINTEXT })).resolves.toBe(true);
    expect(rehash).toHaveBeenCalledTimes(1);
  });
});
