import { Text } from '../_dsfr';
import { Housing, OwnershipKindLabels } from '../../models/Housing';
import { cadastralClassificationOptions } from '../../models/HousingFilters';
import HousingDetailsSubCard from './HousingDetailsSubCard';

interface Props {
  housing: Housing;
}

function HousingDetailsSubCardProperties({ housing }: Props) {
  return (
    <HousingDetailsSubCard title="Logement" isGrey>
      <div>
        <Text size="sm" className="zlv-label">
          Invariant fiscal
        </Text>
        <Text spacing="mb-1w">{housing.invariant}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Type de propriété
        </Text>
        <Text spacing="mb-1w">
          {OwnershipKindLabels[housing.ownershipKind]}
        </Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Type
        </Text>
        <Text spacing="mb-1w">{housing.housingKind}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Surface
        </Text>
        <Text spacing="mb-1w">{housing.livingArea}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Pièces
        </Text>
        <Text spacing="mb-1w">{housing.roomsCount}</Text>
      </div>
      <div>
        <Text size="sm" className="zlv-label">
          Classement cadastral
        </Text>
        <Text spacing="mb-1w">
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
