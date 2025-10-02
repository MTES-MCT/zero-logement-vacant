import { useFeatureFlagEnabled } from 'posthog-js/react';

type AvailableFeatureFlag = 'new-housing-owner-pages';

export interface FeatureFlagLayoutProps {
  flag: AvailableFeatureFlag;
  then: React.ReactNode;
  else: React.ReactNode;
}

function FeatureFlagLayout(props: FeatureFlagLayoutProps) {
  const isEnabled = useFeatureFlagEnabled(props.flag);
  return isEnabled ? props.then : props.else;
}

export default FeatureFlagLayout;
