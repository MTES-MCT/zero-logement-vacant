import { Text } from '../_dsfr/index';
import React from 'react';
import { getBuildingLocation, Housing } from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import { LocalityKindLabels } from '../../models/Locality';
import GeoPerimetersModalLink from '../modals/GeoPerimetersModal/GeoPerimetersModalLink';

interface Props {
  housing: Housing;
}

function HousingDetailsCardLocation({ housing }: Props) {
  return (
    <HousingDetailsSubCard title="Emplacement" isGrey>
      <div>
        <Text size="sm" className="zlv-label">
          Adresse postale
        </Text>
        <Text spacing="mb-1w">{housing.rawAddress.join(' - ')}</Text>
      </div>
      {getBuildingLocation(housing) && (
        <div>
          <Text size="sm" className="zlv-label">
            Complément d'adresse
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
      )}
      {housing.localityKind && (
        <div>
          <Text size="sm" className="zlv-label">
            Périmètres
          </Text>
          <Text spacing="mb-1w">
            {LocalityKindLabels[housing.localityKind]}
          </Text>
        </div>
      )}
      <div>
        <Text size="sm" className="zlv-label">
          Référence cadastrale
        </Text>
        <Text spacing="mb-1w">
          <span>{housing.cadastralReference}</span>
        </Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Périmètres associés
        </Text>
        <Text spacing="mb-1w">{housing.geoPerimeters?.join(', ')}</Text>
        <GeoPerimetersModalLink />
      </div>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsCardLocation;
