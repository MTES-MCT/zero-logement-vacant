import { isPast } from 'date-fns';
import config from '../utils/config';

export interface ResetLinkApi {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
}

/**
 * Expire in 24 hours.
 */
export const RESET_LINK_EXPIRATION = 24;

/**
 * 100 characters id.
 */
export const RESET_LINK_LENGTH = 100;

/**
 * Return true if the given link is in the past or has been used.
 * @param link
 */
export function hasExpired(link: ResetLinkApi): boolean {
  return isPast(link.expiresAt) || !!link.usedAt;
}

export function getPasswordResetLink(id: string): string {
  return `${config.application.host}/mot-de-passe/nouveau#${id}`;
}
