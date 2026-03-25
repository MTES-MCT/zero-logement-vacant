import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import Stack from '@mui/material/Stack';
import CampaignTableNext from '~/components/Campaign/CampaignTableNext';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useNotification } from '~/hooks/useNotification';
import { type Campaign } from '~/models/Campaign';
import {
  useRemoveCampaignMutation,
  useUpdateCampaignMutation
} from '~/services/campaign.service';
import createCampaignDeleteModal from '~/components/Campaign/CampaignDeleteModal';
import {
  createCampaignSentAtModal,
  type CampaignSentAtModalProps
} from '~/components/Campaign/CampaignSentAtModal';

const sentAtCampaignModal = createCampaignSentAtModal();
const removeCampaignModal = createCampaignDeleteModal();

function CampaignListViewNext() {
  useDocumentTitle('Campagnes');

  const [selected, setSelected] = useState<Campaign | null>(null);

  const [updateCampaign, campaignUpdateMutation] = useUpdateCampaignMutation();
  useNotification({
    toastId: 'update-campaign',
    isLoading: campaignUpdateMutation.isLoading,
    isError: campaignUpdateMutation.isError,
    isSuccess: campaignUpdateMutation.isSuccess,
    message: {
      error: 'Erreur lors de la modification de la campagne',
      loading: 'Modification de la campagne...',
      success: 'Campagne modifée !'
    }
  });

  function onSentAt(campaign: Campaign) {
    setSelected(campaign);
    sentAtCampaignModal.open();
  }

  const confirmSentAt: CampaignSentAtModalProps['onConfirm'] = (sentAt) => {
    if (selected) {
      updateCampaign({ ...selected, sentAt });
      sentAtCampaignModal.close();
      setSelected(null);
    }
  };

  const [removeCampaign, campaignRemovalMutation] = useRemoveCampaignMutation();
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
    <Container maxWidth={false} sx={{ py: '2rem' }}>
      <Stack spacing="1rem" useFlexGap>
        <Typography variant="h1">Vos campagnes</Typography>
        <CampaignTableNext onSentAt={onSentAt} onRemove={onRemove} />
      </Stack>

      <sentAtCampaignModal.Component
        sentAt={selected?.sentAt ?? null}
        onConfirm={confirmSentAt}
      />
      <removeCampaignModal.Component onSubmit={confirmRemoval} />
    </Container>
  );
}

export default CampaignListViewNext;
