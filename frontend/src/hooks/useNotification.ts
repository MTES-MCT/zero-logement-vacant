import { useEffect } from 'react';
import { toast, type ToastOptions } from 'react-toastify';

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
    // react-toastify defaults every toast to `role="alert"` (assertive), which
    // interrupts screen readers. Per RGAA 7.5 / WCAG 4.1.3, only errors warrant
    // that urgency; loading and success are polite status messages, so they use
    // `role="status"` (`aria-live="polite"`).
    if (props.isLoading) {
      const loading = props.message?.loading || 'Sauvegarde...';
      toast(loading, {
        autoClose: false,
        isLoading: true,
        role: 'status',
        toastId
      });
    } else if (props.isError) {
      const error = props.message?.error ?? 'Erreur lors de la sauvegarde';
      toast.update(toastId, {
        autoClose: props.autoClose ?? null,
        isLoading: false,
        render: error,
        role: 'alert',
        type: 'error',
        toastId
      });
    } else if (props.isSuccess) {
      const success = props.message?.success ?? 'Sauvegardé !';
      toast.update(toastId, {
        autoClose: props.autoClose ?? null,
        isLoading: false,
        render: success,
        role: 'status',
        type: 'success',
        toastId
      });
    }
  }, [
    props.autoClose,
    props.isError,
    props.isLoading,
    props.isSuccess,
    props.message?.error,
    props.message?.loading,
    props.message?.success,
    toastId
  ]);
}
