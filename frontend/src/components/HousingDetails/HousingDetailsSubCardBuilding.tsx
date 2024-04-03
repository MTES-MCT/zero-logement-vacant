import { Text } from '../_dsfr';
import { Housing } from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import DPE from '../DPE/DPE';

interface Props {
  housing: Housing;
}

function HousingDetailsSubCardBuilding({ housing }: Props) {
  return (
    <HousingDetailsSubCard title="Immeuble" isGrey>
      <div>
        <Text size="sm" className="zlv-label">
          Date de construction
        </Text>
        <Text spacing="mb-1w">{housing.buildingYear}</Text>
      </div>
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
      <>
        <div className="fr-mb-1w">
          <Text size="sm" className="zlv-label">
            Étiquette DPE représentatif (CSTB)
          </Text>
          {housing.energyConsumption ? (
            <DPE
              value={housing.energyConsumption}
              madeAt={housing.energyConsumptionAt}
              bnbId={housing.buildingGroupId}
            />
          ) : (
            <Text spacing="mb-1w">Non renseigné</Text>
          )}
        </div>
      </>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsSubCardBuilding;
