import { Button, type ButtonProps } from '@codegouvfr/react-dsfr/Button';

function SendButton(props: Readonly<Pick<ButtonProps, 'onClick'>>) {
  return (
    <Button
      iconId="fr-icon-send-plane-fill"
      priority="primary"
      onClick={props.onClick}
    >
      Valider et passer au téléchargement
    </Button>
  );
}

export default SendButton;
