import { Text } from '@dataesr/react-dsfr';
import React from 'react';
import { Housing } from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';

interface Props {
  housing: Housing;
}

function HousingDetailsSubCardBuilding({ housing }: Props) {
  return (
    <HousingDetailsSubCard title="Immeuble" isGrey>
      <div>
        <Text size="sm" className="zlv-label">
          Nombre de logements
        </Text>
        <Text spacing="mb-1w">{housing.buildingHousingCount}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Taux de vacance
        </Text>
        <Text spacing="mb-1w">{housing.buildingVacancyRate}%</Text>
      </div>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsSubCardBuilding;
