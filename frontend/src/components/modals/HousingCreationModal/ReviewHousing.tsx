import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { toOccupancy, type DatafoncierHousing } from '@zerologementvacant/models';

import HousingResult from '~/components/HousingResult/HousingResult';
import { createExtendedModal } from '~/components/modals/ConfirmationModal/ExtendedModal';
import { type Housing } from '~/models/Housing';
import { datafoncierApi } from '~/services/datafoncier.service';
import { useCreateHousingMutation } from '~/services/housing.service';

export interface ReviewHousingProps {
  localId: string | null;
  onBack(): void;
  onConfirm(housing: Housing): void;
}

function createReviewHousingModal() {
  const modal = createExtendedModal({
    id: 'review-housing-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: ReviewHousingProps) {
      const { data: datafoncierHousing } =
        datafoncierApi.useFindOneHousingQuery(props.localId ?? skipToken);

      const address = datafoncierHousing
        ? toAddress(datafoncierHousing)
        : undefined;

      const [createHousing, createHousingMutation] = useCreateHousingMutation();

      function handleConfirm() {
        if (props.localId) {
          createHousing({ localId: props.localId })
            .unwrap()
            .then((housing) => {
              props.onConfirm(housing);
            });
        }
      }

      return (
        <modal.Component
          title="Ajouter un logement"
          size="large"
          buttons={[
            {
              children: 'Retour',
              priority: 'secondary',
              doClosesModal: false,
              onClick: props.onBack
            },
            {
              children: 'Confirmer',
              doClosesModal: false,
              disabled: createHousingMutation.isLoading,
              onClick: handleConfirm
            }
          ]}
        >
          <Typography variant="subtitle2" sx={{ mb: '1.5rem' }}>
            Voici le logement que nous avons trouvé à cette adresse/sur cette
            parcelle.
          </Typography>
          {address && datafoncierHousing && (
            <HousingResult
              address={address}
              display="two-lines"
              localId={datafoncierHousing.idlocal}
              apartment={null}
              floor={null}
              occupancy={toOccupancy(datafoncierHousing.ccthp)}
            />
          )}
        </modal.Component>
      );
    }
  };
}

function toAddress(housing: DatafoncierHousing): string {
  const streetNumber = housing.dnvoiri.replace('^0+', '0');
  const repetition = housing.dindic ?? '';
  const street = housing.dvoilib;
  const zipcode = housing.idcom;
  const city = housing.idcomtxt;
  return `${streetNumber}${repetition} ${street}, ${zipcode} ${city}`;
}

export default createReviewHousingModal;
