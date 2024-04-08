import { Feature } from '../../../shared/models/Feature';
import { Establishment } from '../models/Establishment';
import { useEffect, useState } from 'react';
import config from '../utils/config';

export interface FeatureOptions {
  establishmentId?: string;
}

type Features = Record<Feature, Establishment['id'][]>;

export function useFeature(options: FeatureOptions) {
  const [features, setFeatures] = useState<Features>({
    occupancy: [],
  });

  useEffect(() => {
    const establishments = config.feature.occupancy;
    setFeatures({
      occupancy: establishments,
    });
  }, [setFeatures]);

  function isEnabled(feature: Feature): boolean {
    const establishments = features[feature] ?? [];
    return (
      options.establishmentId !== undefined &&
      establishments.includes(options.establishmentId)
    );
  }

  return {
    isEnabled,
  };
}
