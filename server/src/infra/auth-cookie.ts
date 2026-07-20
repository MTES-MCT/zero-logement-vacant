import type { BetterAuthOptions } from 'better-auth';

type DefaultCookieAttributes = NonNullable<
  NonNullable<BetterAuthOptions['advanced']>['defaultCookieAttributes']
>;

export function getAuthCookieAttributes(
  isReviewApp: boolean
): DefaultCookieAttributes {
  if (isReviewApp) {
    // cleverapps.io is a public suffix, so the dynamic frontend and API hosts
    // are cross-site. Partition the Secure SameSite=None cookie to keep review
    // apps working without weakening the staging/production policy.
    return {
      sameSite: 'none',
      secure: true,
      partitioned: true
    };
  }

  return {
    sameSite: 'strict'
  };
}
