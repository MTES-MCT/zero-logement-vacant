import { useFeatureFlagEnabled } from 'posthog-js/react';

import {
  type AvailableFeatureFlag,
  resolveFeatureFlag
} from '~/utils/featureFlags';

export interface FeatureFlagLayoutProps {
  flag: AvailableFeatureFlag;
  then: React.ReactNode;
  else?: React.ReactNode;
}

function FeatureFlagLayout(props: FeatureFlagLayoutProps) {
  const isEnabledByPosthog = useFeatureFlagEnabled(props.flag);
  const isEnabled = resolveFeatureFlag(props.flag, isEnabledByPosthog);
  return isEnabled ? props.then : props.else;
}

export default FeatureFlagLayout;
