import React, { FormEvent, useState } from 'react';
import * as yup from 'yup';
import { emailValidator, useForm } from '../../../hooks/useForm';
import { Button, Link, Row, Text, TextInput, Title } from '@dataesr/react-dsfr';
import prospectService from '../../../services/prospect.service';
import { useHistory } from 'react-router-dom';

function AccountEmailCreationView() {
  const [email, setEmail] = useState('');
  const router = useHistory();

  const schema = yup.object().shape({ email: emailValidator });
  const { isValid, message, messageType } = useForm(schema, { email });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isValid()) {
      const { establishment, hasAccount, hasCommitment } =
        await prospectService.get(email);

      if (establishment && hasAccount && hasCommitment) {
        return router.push({
          pathname: '/inscription/activation',
          state: {
            email,
          },
        });
      }

      if (establishment && hasAccount && !hasCommitment) {
        return router.push('/inscription/en-attente');
      }

      return router.push('/inscription/impossible');
    }
  }

  return (
    <form onSubmit={submit}>
      <Title as="h2">Créer votre compte</Title>
      <Text size="lead">
        Pour créer votre compte sur Zéro Logement Vacant, vous devez
        impérativement avoir déjà signé l'acte d'engagement permettant d'accéder
        aux données LOVAC via la procédure indiquée sur le site du Cerema.
      </Text>
      <TextInput
        type="text"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        messageType={messageType('email')}
        message={message('email', 'Email valide.')}
        placeholder="example@gmail.com"
        label="Adresse email"
        hint="Veuillez renseigner l’adresse utilisée sur Démarches Simplifiées pour transmettre l’acte d'engagement."
        required
      />
      <Row alignItems="middle" className="justify-space-between">
        <Link
          isSimple
          display="flex"
          title="Revenir à l'écran d'accueil"
          href="/"
          icon="ri-arrow-left-line"
          iconSize="1x"
          iconPosition="left"
        >
          Revenir à l'écran d'accueil
        </Link>
        <Button submit title="Continuer">
          Continuer
        </Button>
      </Row>
    </form>
  );
}

export default AccountEmailCreationView;
