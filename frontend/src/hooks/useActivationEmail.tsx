import { useHide } from './useHide';
import { useState } from 'react';
import { useSendActivationEmailMutation } from '../services/signup-link.service';

export function useActivationEmail() {
  const [error, setError] = useState('');
  const { hidden, setHidden } = useHide();

  const [sendActivationEmail] = useSendActivationEmailMutation();

  async function send(email: string) {
    try {
      await sendActivationEmail(email);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setHidden(false);
    }
  }

  return {
    error,
    hidden,
    send,
  };
}
