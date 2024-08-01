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
        children: 'Valider et passer au téléchargement',
        iconId: 'fr-icon-send-plane-fill',
        priority: 'primary'
      }}
      size="large"
      title="Valider ma campagne"
      onOpen={open}
      onSubmit={submit}
    >
      <Alert
        description='Une fois votre campagne validée, la liste des destinataires et le contenu des courriers ne pourront plus être modifiés. Cliquez sur "Confirmer" pour valider ou sur "Annuler" pour revenir en arrière.'
        severity="warning"
        small
      />
    </ConfirmationModal>
  );
}

export default SendButton;
