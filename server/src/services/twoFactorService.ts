import * as OTPAuth from 'otpauth';
import crypto from 'crypto';
import { logger } from '~/infra/logger';

const OTP_CODE_LENGTH = 6;
const OTP_VALIDITY_MINUTES = 10;

export interface TwoFactorConfig {
  secret: string;
  code: string;
  expiresAt: Date;
}

/**
 * Generate a new 2FA configuration for a user
 * @param userEmail - User's email for identification
 * @returns Configuration with secret and current code
 */
export function generateTwoFactorConfig(userEmail: string): TwoFactorConfig {
  // Generate a random secret (hex encoded, OTPAuth will handle base32 internally)
  const secret = crypto.randomBytes(20).toString('hex');

  // Create TOTP instance
  const totp = new OTPAuth.TOTP({
    issuer: 'Zéro Logement Vacant',
    label: userEmail,
    algorithm: 'SHA1',
    digits: OTP_CODE_LENGTH,
    period: 30, // 30 seconds period
    secret: secret
  });

  // Generate current code
  const code = totp.generate();

  // Calculate expiration (10 minutes from now)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_VALIDITY_MINUTES);

  logger.info(`Generated 2FA code for ${userEmail}`, {
    codeLength: code.length,
    expiresAt: expiresAt.toISOString()
  });

  return {
    secret,
    code,
    expiresAt
  };
}

/**
 * Verify a 2FA code against the stored secret
 * @param code - Code provided by the user
 * @param secret - Secret stored in database
 * @param codeGeneratedAt - Timestamp when the code was generated
 * @returns true if code is valid
 */
export function verifyTwoFactorCode(
  code: string,
  secret: string,
  codeGeneratedAt: Date
): boolean {
  // Check if code has expired (10 minutes)
  const now = new Date();
  const expiresAt = new Date(codeGeneratedAt);
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_VALIDITY_MINUTES);

  if (now > expiresAt) {
    logger.warn('2FA code expired', {
      generatedAt: codeGeneratedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString()
    });
    return false;
  }

  // Create TOTP instance with the secret
  const totp = new OTPAuth.TOTP({
    issuer: 'Zéro Logement Vacant',
    algorithm: 'SHA1',
    digits: OTP_CODE_LENGTH,
    period: 30,
    secret: secret
  });

  // Validate the code with a window of ±1 period (90 seconds total)
  const delta = totp.validate({
    token: code,
    window: 1 // Accept codes from previous and next period
  });

  const isValid = delta !== null;

  logger.info('2FA code verification', {
    isValid,
    delta,
    codeLength: code.length
  });

  return isValid;
}

/**
 * Generate a simple 6-digit numeric code (alternative to TOTP)
 * This is simpler and works better for email-based 2FA
 */
export function generateSimpleCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Check if a code has expired
 */
export function isCodeExpired(generatedAt: Date): boolean {
  const now = new Date();
  const expiresAt = new Date(generatedAt);
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_VALIDITY_MINUTES);
  return now > expiresAt;
}
