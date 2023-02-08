import { Text } from '@dataesr/react-dsfr';
import React from 'react';
import { Housing } from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import DPE from '../DPE/DPE';
import { useFeature } from '../../hooks/useFeature';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';

interface Props {
  housing: Housing;
}

function HousingDetailsSubCardBuilding({ housing }: Props) {
  const { establishment } = useSelector(
    (state: ApplicationState) => state.authentication.authUser
  );
  const features = useFeature({
    establishmentId: establishment.id,
  });

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
      {features.isEnabled('occupancy') ? (
        <>
          <div className="fr-mb-3w">
            <Text size="sm" className="zlv-label">
              Étiquette DPE (majoritaire)
            </Text>
            {housing.energyConsumption ? (
              <DPE value={housing.energyConsumption} />
            ) : (
              <Text spacing="mb-0">Non fournie</Text>
            )}
          </div>
          <div className="fr-mb-3w">
            <Text size="sm" className="zlv-label">
              Étiquette DPE (+ mauvaise)
            </Text>
            {housing.energyConsumptionWorst ? (
              <DPE value={housing.energyConsumptionWorst} />
            ) : (
              <Text spacing="mb-0">Non fournie</Text>
            )}
          </div>
        </>
      ) : (
        <></>
      )}
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsSubCardBuilding;
