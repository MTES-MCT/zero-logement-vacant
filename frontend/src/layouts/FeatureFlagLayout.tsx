import { useFeatureFlagEnabled } from 'posthog-js/react';

type AvailableFeatureFlag =
  | 'actual-dpe'
  | 'relative-location'
  | 'new-campaigns';

export interface FeatureFlagLayoutProps {
  flag: AvailableFeatureFlag;
  then: React.ReactNode;
  else?: React.ReactNode;
}

const localFlags: ReadonlyArray<string> = (
  import.meta.env.VITE_FEATURE_FLAGS ?? ''
)
  .split(',')
  .map((f: string) => f.trim())
  .filter(Boolean);

function FeatureFlagLayout(props: FeatureFlagLayoutProps) {
  const isEnabledByPosthog = useFeatureFlagEnabled(props.flag);
  const isEnabled = isEnabledByPosthog ?? localFlags.includes(props.flag);
  return isEnabled ? props.then : props.else;
}

export default FeatureFlagLayout;
