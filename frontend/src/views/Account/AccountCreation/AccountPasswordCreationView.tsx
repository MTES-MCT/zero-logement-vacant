import React, { FormEvent, useState } from 'react';
import * as yup from 'yup';
import {
  passwordConfirmationValidator,
  passwordValidator,
  useForm,
} from '../../../hooks/useForm';
import { Redirect, useHistory } from 'react-router-dom';
import Stepper from '../../../components/Stepper/Stepper';
import { Button, Row, Text, TextInput, Title } from '@dataesr/react-dsfr';
import InternalLink from '../../../components/InternalLink/InternalLink';
import { useProspect } from '../../../hooks/useProspect';
import { Prospect } from '../../../models/Prospect';

interface RouterState {
  prospect?: Prospect | undefined;
  password?: string;
}

function AccountPasswordCreationView() {
  const router = useHistory<RouterState | undefined>();
  const { location } = router;

  const { linkExists, loading, prospect } = useProspect(
    location.state?.prospect
  );

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

  if (loading) {
    return null;
  }

  if (!linkExists) {
    return (
      <>
        <Title as="h1" look="h4">
          Ce lien n’existe pas ou est expiré !
        </Title>
        <Text>Recommencez la procédure ou contactez le support.</Text>
        <Row>
          <InternalLink
            icon="ri-home-fill"
            iconPosition="left"
            iconSize="1x"
            isSimple
            to="/"
          >
            Revenir à l’accueil
          </InternalLink>
        </Row>
      </>
    );
  }

  if (prospect) {
    if (prospect.hasAccount && !prospect.hasCommitment) {
      return <Redirect to="/inscription/en-attente" />;
    }
    if (
      !prospect.establishment ||
      (!prospect.hasAccount && !prospect.hasCommitment)
    ) {
      return <Redirect to="/inscription/impossible" />;
    }
  }

  async function next(e: FormEvent) {
    e.preventDefault();
    if (isValid() && !!prospect) {
      router.push({
        pathname: '/inscription/campagne',
        state: {
          prospect,
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
      <form onSubmit={next}>
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
            to="/inscription/email"
            icon="ri-arrow-left-line"
            iconSize="1x"
            iconPosition="left"
          >
            Revenir à l’étape précédente
          </InternalLink>
          <Button submit title="Continuer">
            Continuer
          </Button>
        </Row>
      </form>
    </>
  );
}

export default AccountPasswordCreationView;
