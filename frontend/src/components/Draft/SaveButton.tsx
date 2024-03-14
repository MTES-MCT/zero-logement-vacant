import Button from '@codegouvfr/react-dsfr/Button';
import { useEffect } from 'react';
import { toast } from 'react-toastify';

interface Props {
  className?: string;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  onSave(): void;
}

function SaveButton(props: Props) {
  const toastId = 'save';

  useEffect(() => {
    if (props.isLoading) {
      toast('Sauvegarde...', {
        autoClose: false,
        isLoading: true,
        toastId,
      });
      return;
    }

    if (props.isError) {
      toast.update(toastId, {
        autoClose: null,
        isLoading: false,
        render: 'Erreur lors de la sauvegarde',
        type: 'error',
        toastId,
      });
    }

    if (props.isSuccess) {
      toast.update(toastId, {
        autoClose: null,
        isLoading: false,
        render: 'Sauvegardé !',
        type: 'success',
        toastId,
      });
      return;
    }

    return () => toast.dismiss(toastId);
  }, [props.isError, props.isLoading, props.isSuccess]);

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
