import config from '~/utils/config';

export type AvailableFeatureFlag = 'new-analysis-page' | 'auth-v2';

export function resolveFeatureFlag(
  flag: AvailableFeatureFlag,
  posthogValue: boolean | undefined,
  fallbackFlags: readonly string[] = config.featureFlags
): boolean {
  return posthogValue ?? fallbackFlags.includes(flag);
}
