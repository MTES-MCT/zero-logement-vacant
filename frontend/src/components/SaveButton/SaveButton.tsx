import Button from '@codegouvfr/react-dsfr/Button';

import { useNotification } from '../../hooks/useNotification';

interface Props {
  className?: string;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  onSave(): void;
}

function SaveButton(props: Readonly<Props>) {
  useNotification({
    isError: props.isError,
    isLoading: props.isLoading,
    isSuccess: props.isSuccess,
    toastId: 'save',
  });

  return (
    <Button
      className={props.className}
      disabled={props.isLoading}
      priority="secondary"
      type="button"
      onClick={props.onSave}
    >
      Sauvegarder
    </Button>
  );
}

export default SaveButton;
