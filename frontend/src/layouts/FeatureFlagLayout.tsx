import { useFeatureFlagEnabled } from 'posthog-js/react';

type AvailableFeatureFlag = 'actual-dpe';

export interface FeatureFlagLayoutProps {
  flag: AvailableFeatureFlag;
  then: React.ReactNode;
  else?: React.ReactNode;
}

function FeatureFlagLayout(props: FeatureFlagLayoutProps) {
  const isEnabled = useFeatureFlagEnabled(props.flag);
  return isEnabled ? props.then : props.else;
}

export default FeatureFlagLayout;
