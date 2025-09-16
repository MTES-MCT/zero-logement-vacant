import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { HousingCountDTO } from '@zerologementvacant/models';

import HousingCount from '~/components/HousingCount/HousingCount';
import { createExtendedModal } from '~/components/modals/ConfirmationModal/ExtendedModal';

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
            <Typography variant="subtitle2">
              Créer une campagne alimente les statistiques nationales et
              valorise vos actions auprès des partenaires comme l’ANAH et la
              Direction générale de l’aménagement, du logement et de la nature
              au sein du Ministère. Ces données anonymisées renforcent les
              politiques contre la vacance et les passoires énergétiques au
              niveau national. Si vous souhaitiez uniquement exporter, cliquez
              sur “Retour”.
            </Typography>
          </Stack>
        </modal.Component>
      );
    }
  };
}

export default createCampaignCreationInfoModal;
