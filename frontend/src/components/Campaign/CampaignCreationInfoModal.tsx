import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Stack from '@mui/material/Stack';

import { HousingCountDTO } from '@zerologementvacant/models';
import { createExtendedModal } from '../modals/ConfirmationModal/ExtendedModal';
import HousingCount from '../HousingCount/HousingCount';

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
              children: 'Retour',
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
          <Stack spacing={2} sx={{ mt: -1 }}>
            {props.count && (
              <HousingCount
                housingCount={props.count.housing}
                ownerCount={props.count.owners}
                suffix
              />
            )}
            <Text size="lg">
        Créer une campagne alimente les statistiques nationales et valorise vos actions auprès des partenaires comme l’ANAH et la Direction générale de l'aménagement, du logement et de la nature au sein du Ministère. Ces données anonymisées renforcent les politiques contre la vacance et les passoires énergétiques au niveau national. Si vous souhaitiez uniquement exporter, cliquez sur “Retour”.
            </Text>
          </Stack>
        </modal.Component>
      );
    }
  };
}

export default createCampaignCreationInfoModal;
