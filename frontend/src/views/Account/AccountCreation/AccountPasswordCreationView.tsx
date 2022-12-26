import React, { useState } from 'react';
import * as yup from 'yup';
import {
  passwordConfirmationValidator,
  passwordValidator,
  useForm,
} from '../../../hooks/useForm';
import { useHistory } from 'react-router-dom';
import Stepper from '../../../components/Stepper/Stepper';
import { Button, Link, Row, Text, TextInput, Title } from '@dataesr/react-dsfr';
import { useEmailLink } from '../../../hooks/useEmailLink';
import signupLinkService from '../../../services/signup-link.service';
import InternalLink from '../../../components/InternalLink/InternalLink';

function AccountPasswordCreationView() {
  const router = useHistory();

  const { link } = useEmailLink({
    service: signupLinkService,
  });

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const schema = yup.object().shape({
    password: passwordValidator,
    confirmation: passwordConfirmationValidator,
  });
  const { isValid, message, messageList, messageType } = useForm(schema, {
    password,
    confirmation,
  });

  if (!link) {
    return (
      <>
        <Title as="h1" look="h4">
          Ce lien n’existe pas ou est expiré !
        </Title>
        <Text>Recommencez la procédure ou contactez le support.</Text>
        <Row justifyContent="right">
          <Button onClick={() => router.replace('/')}>
            Revenir à l'accueil
          </Button>
        </Row>
      </>
    );
  }

  function next() {
    if (isValid()) {
      router.push({
        pathname: '/inscription/campagne',
        state: {
          email: link?.prospectEmail,
          password,
        },
      });
    }
  }

  return (
    <>
      <Stepper
        steps={3}
        currentStep={2}
        currentTitle="Créer votre mot de passe"
        nextStepTitle="Intentions opérationnelles"
      />
      <TextInput
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        messageType={messageType('password')}
        label="Créer votre mot de passe"
        hint="Le mot de passe doit contenir 8 caractères avec au moins une majuscule, une minuscule et un chiffre."
        required
      />
      {messageList('password')?.map((message, i) => (
        <p className={`fr-${message.type}-text`} key={i}>
          {message.text}
        </p>
      ))}
      <TextInput
        type="password"
        className="fr-mt-3w"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        messageType={messageType('confirmation')}
        message={message('confirmation', 'Mots de passe identiques.')}
        label="Confirmer votre mot de passe"
        required
      />
      <Row alignItems="middle" className="justify-space-between">
        <InternalLink
          isSimple
          display="flex"
          title="Revenir à l'étape précédente"
          to="/inscription/email"
          icon="ri-arrow-left-line"
          iconSize="1x"
          iconPosition="left"
        >
          Revenir à l'étape précédente
        </InternalLink>
        <Button title="Continuer" disabled={!isValid()} onClick={next}>
          Continuer
        </Button>
      </Row>
    </>
  );
}

export default AccountPasswordCreationView;
