import bcrypt from 'bcryptjs';
import { verifyPassword as scryptVerify } from 'better-auth/crypto';

import { logger } from '~/infra/logger';

const BCRYPT_PREFIX = /^\$2[aby]\$/;

function isBcryptHash(hash: string): boolean {
  return BCRYPT_PREFIX.test(hash);
}

export interface RehashArgs {
  /** The bcrypt hash that was just verified — used to locate the account row. */
  previousHash: string;
  /** The plaintext password the user submitted. Rehash with the target algorithm. */
  password: string;
}

export interface PasswordVerifierOptions {
  /**
   * Called once after a successful bcrypt verify so the legacy hash can be
   * upgraded to better-auth's default (scrypt). Errors are caught and logged —
   * a transient DB failure must not break sign-in.
   *
   * Pass `null` to disable rehashing (used in tests).
   */
  rehash: ((args: RehashArgs) => Promise<void>) | null;
}

export type PasswordVerifier = (input: {
  hash: string;
  password: string;
}) => Promise<boolean>;

export function createPasswordVerifier(
  opts: PasswordVerifierOptions
): PasswordVerifier {
  return async ({ hash, password }) => {
    if (isBcryptHash(hash)) {
      const ok = await bcrypt.compare(password, hash);
      if (ok && opts.rehash) {
        try {
          await opts.rehash({ previousHash: hash, password });
        } catch (error) {
          logger.warn('Failed to rehash legacy bcrypt password (non-fatal)', {
            error
          });
        }
      }
      return ok;
    }
    return scryptVerify({ hash, password });
  };
}
