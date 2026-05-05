import { useFeatureFlagEnabled } from 'posthog-js/react';

import config from '~/utils/config';

// Add feature flag keys to this union type to use them in the layout
type AvailableFeatureFlag = never;

export interface FeatureFlagLayoutProps {
  flag: AvailableFeatureFlag;
  then: React.ReactNode;
  else?: React.ReactNode;
}

function FeatureFlagLayout(props: FeatureFlagLayoutProps) {
  const isEnabledByPosthog = useFeatureFlagEnabled(props.flag);
  const isEnabled = isEnabledByPosthog ?? config.featureFlags.includes(props.flag);
  return isEnabled ? props.then : props.else;
}

export default FeatureFlagLayout;
