import config from '~/utils/config';

export type AvailableFeatureFlag = 'new-analysis-page' | 'auth-v2';

export function resolveFeatureFlag(
  flag: AvailableFeatureFlag,
  posthogValue: boolean | undefined,
  fallbackFlags: readonly string[] = config.featureFlags
): boolean {
  return posthogValue ?? fallbackFlags.includes(flag);
}

export interface AuthV2State {
  isEnabled: boolean;
  isPending: boolean;
  suppressLegacyAuthHeaders: boolean;
}

export function resolveAuthV2State(
  posthogValue: boolean | undefined,
  fallbackFlags: readonly string[] = config.featureFlags,
  isPosthogEnabled = config.posthog.enabled
): AuthV2State {
  if (posthogValue !== undefined) {
    return {
      isEnabled: posthogValue,
      isPending: false,
      suppressLegacyAuthHeaders: posthogValue
    };
  }

  if (fallbackFlags.includes('auth-v2')) {
    return {
      isEnabled: true,
      isPending: false,
      suppressLegacyAuthHeaders: true
    };
  }

  if (isPosthogEnabled) {
    return {
      isEnabled: false,
      isPending: true,
      suppressLegacyAuthHeaders: true
    };
  }

  return {
    isEnabled: false,
    isPending: false,
    suppressLegacyAuthHeaders: false
  };
}
