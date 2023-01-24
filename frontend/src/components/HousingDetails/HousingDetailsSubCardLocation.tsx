import { Text } from '@dataesr/react-dsfr';
import React from 'react';
import {
  getBuildingLocation,
  hasGeoPerimeters,
  Housing,
} from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import { LocalityKindLabels } from '../../models/Locality';

interface Props {
  housing: Housing;
}

function HousingDetailsCard({ housing }: Props) {
  return (
    <HousingDetailsSubCard title="Emplacement">
      <div>
        <Text size="sm" className="zlv-label">
          Adresse postale
        </Text>
        <Text className="color-bf113">{housing.rawAddress.join(' - ')}</Text>
      </div>
      {getBuildingLocation(housing) ? (
        <div>
          <Text size="sm" className="zlv-label">
            Complément
          </Text>
          <Text>
            {[
              getBuildingLocation(housing)?.building,
              getBuildingLocation(housing)?.entrance,
              getBuildingLocation(housing)?.level,
              getBuildingLocation(housing)?.local,
            ].join(', ')}
          </Text>
        </div>
      ) : (
        <></>
      )}
      {housing.localityKind ? (
        <div>
          <Text size="sm" className="zlv-label">
            Périmètres
          </Text>
          <Text>{LocalityKindLabels[housing.localityKind]}</Text>
        </div>
      ) : (
        <></>
      )}
      {hasGeoPerimeters(housing) ? (
        <div>
          <Text size="sm" className="zlv-label">
            Périmètres
          </Text>
          <Text>{housing.geoPerimeters?.join(', ')}</Text>
        </div>
      ) : (
        <></>
      )}
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsCard;
