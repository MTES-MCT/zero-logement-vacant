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

  // `campaignFromGroupModal`'s dialog is only mounted once `selectedGroup` is
  // set, so both opening it and wiring its conceal listener must run after that
  // render commits (not synchronously in the click handler) — its DOM node
  // doesn't exist before then.
  //
  // Resetting `selectedGroup` to `null` on conceal is mandatory: step 2 is
  // opened by the edge-triggered `selectedGroup` change below, so a stale group
  // left here would make re-selecting the SAME group a no-op (stable RTK Query
  // ref → React bails the update → this effect never re-fires), yielding a dead
  // "Enregistrer" click after a cancel. Clearing to `null` makes every
  // selection a fresh `null → group` edge.
  //
  // We listen to DSFR's own `dsfr.conceal` event directly on the dialog element
  // rather than via react-dsfr's `useIsModalOpen`, because this modal renders
  // through `createPortal`: `useIsModalOpen`'s mount-detection MutationObserver
  // only sees the top-level portal node (the `<form>`) added to `<body>`, never
  // the nested `<dialog>`, so its `onConceal` never fires for this instance.
  // `onClose` is also unavailable — `CreateCampaignFromGroupModal` hard-overrides
  // it with `form.reset`.
  useEffect(() => {
    if (!selectedGroup) {
      return;
    }

    campaignFromGroupModal.open();

    const dialog = document.getElementById(campaignFromGroupModal.id);
    const handleConceal = () => setSelectedGroup(null);
    dialog?.addEventListener('dsfr.conceal', handleConceal);

    return () => {
      dialog?.removeEventListener('dsfr.conceal', handleConceal);
    };
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
