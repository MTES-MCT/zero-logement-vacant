import { useSendActivationEmailMutation } from '../services/signup-link.service';
import { useNotification } from './useNotification';

export function useActivationEmail() {
  const [sendActivationEmail, { isError, isLoading, isSuccess }] =
    useSendActivationEmailMutation();

  useNotification({
    isError,
    isSuccess,
    isLoading,
    message: {
      error: 'Erreur lors de l’envoi de l’e-mail',
      loading: 'Envoi...',
      success: 'Email envoyé'
    },
    toastId: 'send-activation-email'
  });

  return {
    sendActivationEmail
  };
}
