import Button from '@codegouvfr/react-dsfr/Button';
import { useEffect, useState } from 'react';

import { createCampaignFromGroupModal } from '~/components/Group/CreateCampaignFromGroupModal';
import { useNotification } from '~/hooks/useNotification';
import { useUser } from '~/hooks/useUser';
import type { Campaign } from '~/models/Campaign';
import type { Group } from '~/models/Group';
import { useCreateCampaignFromGroupMutation } from '~/services/campaign.service';

import createSelectGroupModal from './SelectGroupModal';

const selectGroupModal = createSelectGroupModal();
const campaignFromGroupModal = createCampaignFromGroupModal({
  id: 'save-campaign-from-group-modal'
});

function SaveCampaignFlow() {
  const { isAdmin, isUsual } = useUser();
  const canCreateCampaign = isAdmin || isUsual;

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [createCampaignFromGroup, createCampaignFromGroupMutation] =
    useCreateCampaignFromGroupMutation();

  useNotification({
    toastId: 'save-campaign-from-group',
    isError: createCampaignFromGroupMutation.isError,
    isLoading: createCampaignFromGroupMutation.isLoading,
    isSuccess: createCampaignFromGroupMutation.isSuccess,
    message: {
      error: 'Erreur lors de la création de la campagne',
      loading: 'Création de la campagne...',
      success: 'La campagne a été ajoutée'
    }
  });

  // `campaignFromGroupModal`'s dialog is only mounted once `selectedGroup`
  // is set, so `.open()` must run after that render commits (not
  // synchronously in the click handler) or its DOM node won't exist yet.
  useEffect(() => {
    if (selectedGroup) {
      campaignFromGroupModal.open();
    }
  }, [selectedGroup]);

  function handleGroupSelect(group: Group): void {
    setSelectedGroup(group);
    selectGroupModal.close();
  }

  function handleCampaignSubmit(
    campaign: Pick<Campaign, 'title' | 'description' | 'sentAt'>
  ): void {
    if (selectedGroup) {
      createCampaignFromGroup({ campaign, group: selectedGroup })
        .unwrap()
        .then(() => {
          campaignFromGroupModal.close();
          setSelectedGroup(null);
        });
    }
  }

  if (!canCreateCampaign) {
    return null;
  }

  return (
    <>
      <Button
        iconId="fr-icon-save-line"
        priority="primary"
        onClick={selectGroupModal.open}
      >
        Enregistrer une campagne
      </Button>

      <selectGroupModal.Component onSelect={handleGroupSelect} />

      {selectedGroup && (
        <campaignFromGroupModal.Component
          group={selectedGroup}
          stepper={{ currentStep: 2, stepCount: 2 }}
          onSubmit={handleCampaignSubmit}
        />
      )}
    </>
  );
}

export default SaveCampaignFlow;
