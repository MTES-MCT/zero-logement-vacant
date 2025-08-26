import Alert from '@codegouvfr/react-dsfr/Alert';

import { createConfirmationModal } from '~/components/modals/ConfirmationModal/ConfirmationModalNext';

export interface SendModalProps {
  onSend(): Promise<void>;
}

function createSendModal() {
  const modal = createConfirmationModal({
    id: 'campaign-validate-draft',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: Readonly<SendModalProps>) {
      return (
        <modal.Component
          size="large"
          title="Valider ma campagne"
          onSubmit={props.onSend}
        >
          <Alert
            description='Une fois votre campagne validée, la liste des destinataires et le contenu des courriers ne pourront plus être modifiés. Cliquez sur "Confirmer" pour valider ou sur "Annuler" pour revenir en arrière.'
            severity="warning"
            small
          />
        </modal.Component>
      );
    }
  };
}

export default createSendModal;
