import { useEffect } from 'react';
import { toast, ToastOptions } from 'react-toastify';

export interface NotificationProps extends Pick<ToastOptions, 'autoClose'> {
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  message?: {
    error?: string;
    loading?: string;
    success?: string;
  };
  toastId: string;
}

export function useNotification(props: NotificationProps) {
  const toastId: string = props.toastId;

  useEffect(() => {
    if (props.isLoading) {
      const loading = props.message?.loading || 'Sauvegarde...';
      toast(loading, {
        autoClose: false,
        isLoading: true,
        toastId,
      });
      return;
    }

    if (props.isError) {
      const error = props.message?.error ?? 'Erreur lors de la sauvegarde';
      toast.update(toastId, {
        autoClose: props.autoClose ?? null,
        isLoading: false,
        render: error,
        type: 'error',
        toastId,
      });
      return;
    }

    if (props.isSuccess) {
      const success = props.message?.success ?? 'Sauvegardé !';
      if (toast.isActive(toastId)) {
        toast.update(toastId, {
          autoClose: props.autoClose ?? null,
          isLoading: false,
          render: success,
          type: 'success',
          toastId,
        });
      } else {
        toast.success(success, {
          type: 'success',
          autoClose: props.autoClose,
          toastId,
        });
      }
      return;
    }

    return () => toast.dismiss(toastId);
  }, [
    props.autoClose,
    props.isError,
    props.isLoading,
    props.isSuccess,
    props.message?.error,
    props.message?.loading,
    props.message?.success,
    toastId,
  ]);
}
