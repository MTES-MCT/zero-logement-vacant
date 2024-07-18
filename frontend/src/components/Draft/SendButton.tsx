import { Alert } from '@codegouvfr/react-dsfr/Alert';

import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import { useForm } from '../../hooks/useForm';

interface Props {
  className?: string;
  form: ReturnType<typeof useForm>;
  onSend(): void;
}

function SendButton(props: Readonly<Props>) {
  function open(openModal: () => void): void {
    props.form.validate(() => {
      openModal();
    });
  }

  function submit(): void {
    props.onSend();
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
      onOpen={open}
      onSubmit={submit}
    >
      <Alert
        description="Une fois débuté l’envoi, votre campagne ne pourra plus être modifiée. Cliquez sur “Confirmer” pour poursuivre si vous avez finalisé votre courrier et vérifié la liste des destinataires. Sinon, cliquez sur “Annuler” pour revenir en arrière."
        severity="warning"
        small
      />
    </ConfirmationModal>
  );
}

export default SendButton;
