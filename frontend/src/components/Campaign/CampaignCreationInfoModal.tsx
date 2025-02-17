import { Alert } from '@codegouvfr/react-dsfr/Alert';

import { HousingCountDTO } from '@zerologementvacant/models';
import { createExtendedModal } from '../modals/ConfirmationModal/ExtendedModal';
import HousingCount from '../HousingCount/HousingCount';
import Stack from '@mui/material/Stack';

export interface CampaignCreationInfoModalProps {
  count?: HousingCountDTO;
  onBack(): void;
  onConfirm(): void;
}

function createCampaignCreationInfoModal() {
  const modal = createExtendedModal({
    id: 'campaign-creation-info',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: CampaignCreationInfoModalProps) {
      return (
        <modal.Component
          buttons={[
            {
              children: 'Revenir en arrière',
              doClosesModal: false,
              priority: 'secondary',
              onClick: props.onBack
            },
            {
              children: 'Créer une campagne',
              doClosesModal: false,
              onClick: props.onConfirm
            }
          ]}
          size="extra-large"
          title="Créer une campagne"
        >
          <Stack spacing={2}>
            {props.count && (
              <HousingCount
                housingCount={props.count.housing}
                ownerCount={props.count.owners}
                suffix
              />
            )}

            <Alert
              description="Créer une campagne alimente les statistiques nationales et valorise vos actions auprès des partenaires comme l’ANAH et le Ministère du Logement. Ces données anonymisées renforcent les politiques contre la vacance et les passoires énergétiques au niveau national. Si vous souhaitiez uniquement exporter, cliquez sur “Revenir en arrière”."
              severity="info"
              title="Information importante avant de créer votre campagne"
            />
          </Stack>
        </modal.Component>
      );
    }
  };
}

export default createCampaignCreationInfoModal;
