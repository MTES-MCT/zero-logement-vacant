import { Text } from '@dataesr/react-dsfr';
import React from 'react';
import { Housing, OwnershipKindLabels } from '../../models/Housing';
import config from '../../utils/config';
import HousingDetailsSubCard from './HousingDetailsSubCard';

interface Props {
  housing: Housing;
}

function HousingDetailsSubCardSituation({ housing }: Props) {
  return (
    <HousingDetailsSubCard title="Situation">
      <div>
        <Text size="sm" className="zlv-label">
          Durée de vacance au 01/01/{config.dataYear}
        </Text>
        <Text>
          {config.dataYear - housing.vacancyStartYear} ans (
          {housing.vacancyStartYear})
        </Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Cause de la vacance
        </Text>
        <Text>
          {housing.vacancyReasons?.map((reason, reasonIdx) => (
            <div key={`${housing.id}_${reasonIdx}`}>{reason}</div>
          ))}
        </Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Taxé
        </Text>
        <Text>{housing.taxed ? 'Oui' : 'Non'}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Type de propriété
        </Text>
        <Text>{OwnershipKindLabels[housing.ownershipKind]}</Text>
      </div>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsSubCardSituation;
