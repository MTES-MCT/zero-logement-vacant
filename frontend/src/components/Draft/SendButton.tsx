import { Alert } from '@codegouvfr/react-dsfr/Alert';

import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import { useForm } from '../../hooks/useForm';

interface Props {
  className?: string;
  form: ReturnType<typeof useForm>;
  onSend(): Promise<void>;
}

function SendButton(props: Readonly<Props>) {
  function open(openModal: () => void): void {
    props.form.validate(() => {
      openModal();
    });
  }

  async function submit(): Promise<void> {
    await props.onSend();
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
      <Text size="lg">
        Une fois votre campagne validée, la liste des destinataires et le contenu des courriers ne pourront plus être modifiés. Cliquez sur "Confirmer" pour valider ou sur "Annuler" pour revenir en arrière.
      </Text>
    </ConfirmationModal>
  );
}

export default SendButton;
