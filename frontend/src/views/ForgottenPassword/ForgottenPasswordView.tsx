import {
  Button,
  Col,
  Container,
  Row,
  Text,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';
import building from '../../assets/images/building.svg';
import React, { FormEvent, useState } from 'react';
import * as yup from 'yup';
import { useForm } from '../../hooks/useForm';
import authService from '../../services/auth.service';
import Alert from '../../components/Alert/Alert';

function ForgottenPasswordView() {
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const form = yup.object().shape({
    email: yup
      .string()
      .required('Veuillez renseigner un email.')
      .email('Veuillez renseigner un email valide.'),
  });
  const { isValid, message, messageType } = useForm(form, {
    email,
  });

  async function submit(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      if (isValid()) {
        await authService.sendResetEmail(email);
        setEmailSent(true);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Container as="main" spacing="py-4w">
      <Row gutters>
        <Col>
          {emailSent && (
            <Alert
              title="Email envoyé"
              description="Vous le recevrez dans quelques minutes."
              type="success"
              className="fr-my-3w"
              closable
            />
          )}
          {error && (
            <Alert
              title="Erreur"
              description="Impossible d'envoyer l'email."
              className="fr-my-3w"
              closable
              type="error"
            />
          )}
          <Title as="h1" look="h2">
            Réinitialisez votre mot de passe
          </Title>
          <Text size="sm" className="subtitle">
            Nous vous enverrons un mail de réinitialisation de mot de passe si
            vous avez un compte.
          </Text>
          <form onSubmit={submit}>
            <TextInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              messageType={messageType('email')}
              message={message('email')}
              data-testid="email-input"
              label="Adresse email : "
              placeholder="exemple@gmail.com"
              required
            />
            <Button disabled={!isValid()} submit>
              Envoyer un lien par mail
            </Button>
          </form>
        </Col>
        <Col n="5" offset="1" className="align-right">
          <img
            src={building}
            style={{ width: '100%', height: '100%' }}
            alt=""
          />
        </Col>
      </Row>
    </Container>
  );
}

export default ForgottenPasswordView;
