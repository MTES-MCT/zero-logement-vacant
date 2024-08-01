import Button from '@codegouvfr/react-dsfr/Button';

import {
  NotificationProps,
  useNotification,
} from '../../hooks/useNotification';

interface Props
  extends Pick<
    NotificationProps,
    'autoClose' | 'isError' | 'isLoading' | 'isSuccess' | 'message'
  > {
  className?: string;
  onSave(): void;
}

function SaveButton(props: Readonly<Props>) {
  useNotification({
    autoClose: props.autoClose,
    isError: props.isError,
    isLoading: props.isLoading,
    isSuccess: props.isSuccess,
    message: props.message,
    toastId: 'save',
  });

  return (
    <Button
      className={props.className}
      disabled={props.isLoading}
      iconId="fr-icon-save-line"
      priority="secondary"
      type="button"
      onClick={props.onSave}
    >
      Sauvegarder mon brouillon
    </Button>
  );
}

export default SaveButton;
