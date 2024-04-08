import { useEffect } from 'react';
import { toast } from 'react-toastify';

interface Props {
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  toastId: string;
}

export function useNotification(props: Props) {
  const toastId: string = props.toastId;

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
      if (toast.isActive(toastId)) {
        toast.update(toastId, {
          autoClose: null,
          isLoading: false,
          render: 'Sauvegardé !',
          type: 'success',
          toastId,
        });
      } else {
        toast.success('Sauvegardé !', {
          type: 'success',
          toastId,
        });
      }
      return;
    }

    return () => toast.dismiss(toastId);
  }, [props.isError, props.isLoading, props.isSuccess, toastId]);
}
