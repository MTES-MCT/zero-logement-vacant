import { isPast } from 'date-fns';
import config from '~/config';

export interface SignupLinkApi {
  id: string;
  prospectEmail: string;
  expiresAt: Date;
}

/**
 * Expire in 7 days.
 */
export const SIGNUP_LINK_EXPIRATION = 24 * 7;

/**
 * 100 characters id.
 */
export const SIGNUP_LINK_LENGTH = 100;

/**
 * Return true if the given link is in the past or has been used.
 * @param link
 */
export function hasExpired(link: SignupLinkApi): boolean {
  return isPast(link.expiresAt);
}

export function getAccountActivationLink(id: string): string {
  return `${config.app.host}/inscription/mot-de-passe#${id}`;
}
