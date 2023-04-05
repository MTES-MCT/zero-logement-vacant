import {
  Button,
  Container,
  Link,
  Row,
  Text,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';
import React, { FormEvent, useState } from 'react';
import { useHistory } from 'react-router-dom';
import * as yup from 'yup';

import { emailValidator, useForm } from '../../../hooks/useForm';
import InternalLink from '../../../components/InternalLink/InternalLink';
import { useActivationEmail } from '../../../hooks/useActivationEmail';
import styles from './account-email-creation-view.module.scss';

function AccountEmailCreationView() {
  const [email, setEmail] = useState('');
  const router = useHistory();
  const { send: sendActivationEmail } = useActivationEmail();

  const schema = yup.object().shape({ email: emailValidator });
  const { isValid, message, messageType } = useForm(schema, { email });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isValid()) {
      await sendActivationEmail(email);
      return router.push({
        pathname: '/inscription/activation',
        state: {
          email,
        },
      });
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
      <Container as="section" fluid>
        <Row justifyContent="right">
          <Link
            className={styles.help}
            href="https://zerologementvacant.crisp.help/fr/category/1-creer-et-gerer-un-compte-1nni4io/"
            isSimple
            size="sm"
          >
            Besoin d’aide pour créer votre compte ?
          </Link>
        </Row>
      </Container>
      <TextInput
        type="email"
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
        <InternalLink
          display="flex"
          icon="ri-arrow-left-line"
          iconSize="1x"
          iconPosition="left"
          isSimple
          to="/"
        >
          Revenir à l'écran d'accueil
        </InternalLink>
        <Button submit>Continuer</Button>
      </Row>
    </form>
  );
}

export default AccountEmailCreationView;
