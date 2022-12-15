import { Text } from '@dataesr/react-dsfr';
import React from 'react';
import { Housing } from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';

interface Props {
  housing: Housing;
}

function HousingDetailsSubCardBuilding({ housing }: Props) {
  return (
    <HousingDetailsSubCard title="Immeuble">
      <div>
        <Text size="sm" className="zlv-label">
          Nombre de logements
        </Text>
        <Text>{housing.buildingHousingCount}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Taux de vacances
        </Text>
        <Text>{housing.buildingVacancyRate}%</Text>
      </div>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsSubCardBuilding;
