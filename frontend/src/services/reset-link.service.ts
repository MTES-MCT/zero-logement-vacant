import config from '../utils/config';

interface ResetLinkValidation {
  valid: true;
}

const sendResetEmail = async (email: string): Promise<void> => {
  const { status } = await fetch(`${config.apiEndpoint}/reset-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (status >= 500) {
    throw new Error('Impossible d’envoyer le mail');
  }
};

const get = async (id: string): Promise<ResetLinkValidation> => {
  const response = await fetch(`${config.apiEndpoint}/reset-links/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    throw new Error('Impossible de récupérer le lien');
  }
  return response.json();
};

const resetPassword = async (key: string, password: string): Promise<void> => {
  const response = await fetch(`${config.apiEndpoint}/account/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, password })
  });
  if (!response.ok) {
    if (response.status === 404 || response.status === 410) {
      throw new Error(
        'Ce lien de réinitialisation n’est plus valide. Demandez un nouveau lien.'
      );
    }
    throw new Error(
      'Votre mot de passe n’a pas pu être enregistré. Veuillez réessayer. Si le problème persiste, demandez un nouveau lien de réinitialisation.'
    );
  }
};

const resetLinkService = {
  sendResetEmail,
  get,
  resetPassword
};

export default resetLinkService;
