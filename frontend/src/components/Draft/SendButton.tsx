import { Alert } from '@codegouvfr/react-dsfr/Alert';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import { useUpdateCampaignMutation } from '../../services/campaign.service';
import { Campaign } from '../../models/Campaign';
import { useNotification } from '../../hooks/useNotification';

interface Props {
  className?: string;
  campaign: Campaign;
}

function SendButton(props: Readonly<Props>) {
  const [updateCampaign, mutation] = useUpdateCampaignMutation();

  useNotification({
    isError: mutation.isError,
    isLoading: mutation.isLoading,
    isSuccess: mutation.isSuccess,
    toastId: 'sending',
  });

  function submit(): void {
    updateCampaign({
      ...props.campaign,
      status: 'sending',
    });
  }

  return (
    <ConfirmationModal
      modalId="campaign-validate-draft"
      openingButtonProps={{
        children: 'Débuter l’envoi',
        iconId: 'fr-icon-send-plane-fill',
        priority: 'primary',
      }}
      size="large"
      title="Envoi de la campagne"
      onSubmit={submit}
    >
      <Alert
        description="Une fois débuté l’envoi, votre campagne ne pourra plus être modifiée. Veuillez confirmer pour poursuivre ou cliquer sur “Annuler” ou fermer la fenêtre pour revenir en arrière."
        severity="warning"
        small
      />
    </ConfirmationModal>
  );
}

export default SendButton;
