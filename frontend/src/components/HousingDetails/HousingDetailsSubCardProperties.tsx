import { Text } from '@dataesr/react-dsfr';
import React from 'react';
import { Housing } from '../../models/Housing';
import { cadastralClassificationOptions } from '../../models/HousingFilters';
import HousingDetailsSubCard from './HousingDetailsSubCard';

interface Props {
  housing: Housing;
}

function HousingDetailsSubCardProperties({ housing }: Props) {
  return (
    <HousingDetailsSubCard title="Caractéristiques">
      <div>
        <Text size="sm" className="zlv-label">
          Type
        </Text>
        <Text>{housing.housingKind}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Surface
        </Text>
        <Text>{housing.livingArea}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Pièces
        </Text>
        <Text>{housing.roomsCount}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Construction
        </Text>
        <Text>{housing.buildingYear}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Classement cadastral
        </Text>
        <Text>
          {
            cadastralClassificationOptions.find(
              (_) => _.value === String(housing.cadastralClassification)
            )?.label
          }
        </Text>
      </div>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsSubCardProperties;
