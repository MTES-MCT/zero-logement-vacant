import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import { Campaign } from '../../models/Campaign';
import {
  useRemoveCampaignMutation,
  useUpdateCampaignMutation
} from '../../services/campaign.service';
import { useNotification } from '../../hooks/useNotification';
import CampaignTable from '../../components/Campaign/CampaignTable';

const archiveCampaignModal = createModal({
  id: 'archive-campaign-modal',
  isOpenedByDefault: false
});
const removeCampaignModal = createModal({
  id: 'remove-campaign-modal',
  isOpenedByDefault: false
});

function CampaignListView() {
  useDocumentTitle('Campagnes');

  const [removeCampaign, campaignRemovalMutation] = useRemoveCampaignMutation();
  const [updateCampaign, campaignUpdateMutation] = useUpdateCampaignMutation();
  useNotification({
    toastId: 'remove-campaign',
    isLoading: campaignRemovalMutation.isLoading,
    isError: campaignRemovalMutation.isError,
    isSuccess: campaignRemovalMutation.isSuccess,
    message: {
      error: 'Erreur lors de la suppression de la campagne',
      loading: 'Suppression de la campagne...',
      success: 'Campagne supprimée !'
    }
  });
  useNotification({
    toastId: 'archive-campaign',
    isLoading: campaignUpdateMutation.isLoading,
    isError: campaignUpdateMutation.isError,
    isSuccess: campaignUpdateMutation.isSuccess,
    message: {
      error: 'Erreur lors de l’archivage de la campagne',
      loading: 'Archivage de la campagne...',
      success: 'Campagne archivée !'
    }
  });

  const [selected, setSelected] = useState<Campaign | null>(null);

  function onArchive(campaign: Campaign) {
    setSelected(campaign);
    archiveCampaignModal.open();
  }

  async function confirmArchiving() {
    if (selected) {
      updateCampaign({ ...selected, status: 'archived' });
      archiveCampaignModal.close();
      setSelected(null);
    }
  }

  function onRemove(campaign: Campaign) {
    setSelected(campaign);
    removeCampaignModal.open();
  }

  function confirmRemoval() {
    if (selected) {
      removeCampaign(selected.id);
      removeCampaignModal.close();
      setSelected(null);
    }
  }

  return (
    <MainContainer
      title={
        <>
          Vos campagnes
          <Button
            priority="secondary"
            linkProps={{
              to: 'https://zlv.notion.site/R-diger-un-courrier-15e88e19d2bc404eaf371ddcb4ca42c5',
              target: '_blank'
            }}
            className="float-right"
          >
            Voir la bibliothèque des courriers
          </Button>
        </>
      }
    >
      <CampaignTable onArchive={onArchive} onRemove={onRemove} />

      <archiveCampaignModal.Component
        title="Archiver la campagne"
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w'
          },
          {
            children: 'Confirmer',
            onClick: confirmArchiving,
            doClosesModal: false
          }
        ]}
      >
        <Typography>
          Êtes-vous sûr de vouloir archiver cette campagne ?
        </Typography>
      </archiveCampaignModal.Component>

      <removeCampaignModal.Component
        title="Supprimer la campagne"
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w'
          },
          {
            children: 'Confirmer',
            onClick: confirmRemoval,
            doClosesModal: false
          }
        ]}
      >
        <Typography>
          Êtes-vous sûr de vouloir supprimer cette campagne ? Les statuts des logements "En attente de retour" repasseront en "Non suivi". Les autres statuts mis à jour ne seront pas modifiés.
        </Typography>
      </removeCampaignModal.Component>
    </MainContainer>
  );
}

export default CampaignListView;
