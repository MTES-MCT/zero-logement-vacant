import Typography from '@mui/material/Typography';

import Button from '@codegouvfr/react-dsfr/Button';
import { useForm } from '../../hooks/useForm';
import { createConfirmationModal } from '../modals/ConfirmationModal/ConfirmationModalNext';
import Tooltip from '~/Tooltip/Tooltip';
import Stack from '@mui/material/Stack';

interface Props {
  className?: string;
  form: ReturnType<typeof useForm>;
  onSend(): Promise<void>;
}

const modal = createConfirmationModal({
  id: 'campaign-validate-draft',
  isOpenedByDefault: false
});

function SendButton(props: Readonly<Props>) {
  function open(): void {
    props.form.validate(() => {
      modal.open();
    });
  }

  async function submit(): Promise<void> {
    await props.onSend();
  }

  return (
    <>
      <Stack direction="row" spacing="1rem" sx={{ alignItems: 'center' }}>
        <Tooltip
          mode="manual"
          place="top"
          align="end"
          title={
            <>
              <Typography
                component="p"
                variant="caption"
                sx={{ fontWeight: 700, mb: '1rem' }}
              >
                Enregistrez votre campagne de courriers afin de suivre les
                propriétaires contactés !
              </Typography>
              <Typography component="p" variant="caption">
                Même si vous n’utilisez pas l’éditeur de courrier de ZLV, pensez
                à bien valider l’envoi de la campagne afin d’enregistrer les
                prises de contact effectuées auprès des propriétaires. Il sera
                ensuite plus facile de suivre les retours et d’obtenir des
                statistiques détaillées sur vos campagnes envoyées.
              </Typography>
            </>
          }
        />

        <Button iconId="fr-icon-send-plane-fill" onClick={open}>
          Valider et passer au téléchargement
        </Button>
      </Stack>

      <modal.Component
        size="large"
        title="Valider ma campagne"
        onSubmit={submit}
      >
        <Typography variant="subtitle2">
          Une fois votre campagne validée, la liste des destinataires et le
          contenu des courriers ne pourront plus être modifiés. Cliquez sur
          “Confirmer” pour valider ou sur “Annuler” pour revenir en arrière.
        </Typography>
      </modal.Component>
    </>
  );
}

export default SendButton;
