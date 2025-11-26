import { isPast } from 'date-fns';
import { ResetLinkDTO } from '@zerologementvacant/models';
import config from '~/infra/config';

export interface ResetLinkApi extends ResetLinkDTO {
  userId: string;
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
  return `${config.app.host}/mot-de-passe/nouveau#${id}`;
}
