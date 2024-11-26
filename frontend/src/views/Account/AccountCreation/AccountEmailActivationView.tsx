import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { Text } from '../../../components/_dsfr';
import styles from '../forgotten-password-view.module.scss';
import { useActivationEmail } from '../../../hooks/useActivationEmail';

interface State {
  email?: string;
}

function AccountEmailActivationView() {
  const location: { state?: State } = useLocation();
  const { error, hidden, send: sendActivationEmail } = useActivationEmail();

  const status = useMemo(() => (error ? 'error' : 'valid'), [error]);

  function send(): void {
    const { state } = location;
    if (state?.email) {
      sendActivationEmail(state.email);
    }
  }

  if (!location.state?.email) {
    return <Navigate to="/inscription/email" />;
  }

  const confirmationClasses = classNames(`fr-${status}-text`, {
    [styles.hidden]: hidden
  });

  return (
    <>
      <Typography component="h2" variant="h4" mb={3}>
        Vous devez confirmer votre adresse mail.
      </Typography>
      <Text>
        Pour cela rendez vous sur votre boite mail, vous avez dû recevoir 
        <b>un mail de vérification</b> pour vérifier votre identité.
      </Text>
      <Text size="sm" className="subtitle fr-mb-0">
        Vous ne trouvez pas le mail ?
      </Text>
      <Text size="sm" className="subtitle">
        Vérifiez qu’il ne s’est pas glissé dans vos spams ou 
        <button
          onClick={send}
          className={classNames(
            'fr-link',
            styles.buttonLink,
            styles.buttonLinkSm
          )}
        >
          renvoyer le mail
        </button>
        .
      </Text>
      <Text size="sm" className={confirmationClasses}>
        {error ? error : 'Email envoyé.'}
      </Text>
    </>
  );
}

export default AccountEmailActivationView;
