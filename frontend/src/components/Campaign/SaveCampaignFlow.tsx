import Button from '@codegouvfr/react-dsfr/Button';
import { useState } from 'react';

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
  const { canCreateCampaign } = useUser();

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  // Bumped every time the flow is (re)opened. Passed to SelectGroupModal to
  // defer the groups query until the flow is first opened, and to re-key its
  // search input so a reopen starts blank.
  const [openCount, setOpenCount] = useState(0);

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

  // Both modals are mounted unconditionally (step 2 tolerates a null group),
  // mirroring `HousingCreationModal`. This is required: DSFR initialises a
  // `<dialog>` asynchronously after it mounts, so `.open()` on a dialog that was
  // *conditionally* mounted in the same interaction throws
  // `Cannot read properties of null (reading 'modal')`. Keeping step 2 mounted
  // means it is DSFR-initialised well before the user selects a group, so the
  // synchronous `.open()` below always works. It also makes re-opening after a
  // cancel trivial — `.open()` runs on every selection, not on a state edge.
  function handleGroupSelect(group: Group): void {
    setSelectedGroup(group);
    selectGroupModal.close();
    campaignFromGroupModal.open();
  }

  function handleCampaignSubmit(
    campaign: Pick<Campaign, 'title' | 'description' | 'sentAt'>
  ): void {
    if (selectedGroup) {
      createCampaignFromGroup({ campaign, group: selectedGroup })
        .unwrap()
        .then(
          () => {
            campaignFromGroupModal.close();
            setSelectedGroup(null);
          },
          // Swallow the rejection so a failed submit doesn't surface as an
          // unhandled promise rejection. No recovery is needed here: on failure
          // the modal stays open and `selectedGroup` is untouched (the success
          // branch above never runs), letting the user retry, and the error
          // toast is already driven by `useNotification` watching the
          // mutation's `isError`.
          () => {}
        );
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
        onClick={() => {
          setOpenCount((count) => count + 1);
          selectGroupModal.open();
        }}
      >
        Enregistrer une campagne
      </Button>

      <selectGroupModal.Component
        openCount={openCount}
        onSelect={handleGroupSelect}
      />

      <campaignFromGroupModal.Component
        group={selectedGroup}
        stepper={{ currentStep: 2, stepCount: 2 }}
        submitting={createCampaignFromGroupMutation.isLoading}
        onSubmit={handleCampaignSubmit}
      />
    </>
  );
}

export default SaveCampaignFlow;
