import { useFeatureFlagEnabled } from 'posthog-js/react';

import config from '~/utils/config';

type AvailableFeatureFlag =
  | 'actual-dpe'
  | 'relative-location'
  | 'new-campaigns';

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
