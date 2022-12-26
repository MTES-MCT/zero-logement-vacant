import { Text, Title } from '@dataesr/react-dsfr';
import { Redirect, useHistory } from 'react-router-dom';
import InternalLink from '../../../components/InternalLink/InternalLink';
import React, { useEffect, useMemo, useState } from 'react';
import { useHide } from '../../../hooks/useHide';
import classNames from 'classnames';
import styles from '../forgotten-password-view.module.scss';
import signupLinkService from '../../../services/signup-link.service';

interface State {
  email?: string;
}

function AccountEmailActivationView() {
  const router = useHistory<State | undefined>();
  const [error, setError] = useState('');
  const { hidden, setHidden } = useHide();

  const status = useMemo(() => (error ? 'error' : 'valid'), [error]);

  useEffect(() => {
    const { state } = router.location;
    if (state?.email) {
      signupLinkService
        .sendActivationEmail(state.email)
        .then(() => {
          setHidden(false);
        })
        .catch((error) => {
          setError((error as Error).message);
        });
    }
  }, [router.location, setHidden]);

  if (!router.location.state?.email) {
    return <Redirect to="/inscription/email" />;
  }

  const confirmationClasses = classNames(`fr-${status}-text`, {
    [styles.hidden]: hidden,
  });

  return (
    <>
      <Title as="h2" look="h4">
        Vous devez confirmer votre adresse mail.
      </Title>
      <Text>
        Pour cela rendez vous sur votre boite mail, vous avez dû recevoir 
        <b>un mail de vérification</b> pour vérifier votre identité.
      </Text>
      <Text size="sm" className="subtitle fr-mb-0">
        Vous ne trouvez pas le mail ?
      </Text>
      <Text size="sm" className="subtitle">
        Vérifiez qu’il ne s’est pas glissé dans vos spams ou 
        <InternalLink to={router.location} isSimple>
          renvoyer le mail
        </InternalLink>
        .
      </Text>
      <Text size="sm" className={confirmationClasses}>
        {error ? error : 'Email envoyé.'}
      </Text>
    </>
  );
}

export default AccountEmailActivationView;
