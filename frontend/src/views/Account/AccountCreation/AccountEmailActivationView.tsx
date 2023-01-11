import { Text, Title } from '@dataesr/react-dsfr';
import { Redirect, useHistory } from 'react-router-dom';
import React, { useMemo } from 'react';
import classNames from 'classnames';
import styles from '../forgotten-password-view.module.scss';
import ButtonLink from '../../../components/ButtonLink/ButtonLink';
import { useActivationEmail } from '../../../hooks/useActivationEmail';

interface State {
  email?: string;
}

function AccountEmailActivationView() {
  const router = useHistory<State | undefined>();
  const { error, hidden, send: sendActivationEmail } = useActivationEmail();

  const status = useMemo(() => (error ? 'error' : 'valid'), [error]);

  function send(): void {
    const { state } = router.location;
    if (state?.email) {
      sendActivationEmail(state.email);
    }
  }

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
        <ButtonLink size="sm" onClick={send}>
          renvoyer le mail
        </ButtonLink>
        .
      </Text>
      <Text size="sm" className={confirmationClasses}>
        {error ? error : 'Email envoyé.'}
      </Text>
    </>
  );
}

export default AccountEmailActivationView;
