import {
  Button,
  Col,
  Container,
  Row,
  Text,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';
import React, { ChangeEvent, FormEvent, useState } from 'react';
import building from '../../assets/images/building.svg';
import * as yup from 'yup';
import { useForm } from '../../hooks/useForm';
import { useHistory } from 'react-router-dom';
import authService from '../../services/auth.service';
import { useResetLink } from '../../hooks/useResetLink';
import Alert from '../../components/Alert/Alert';

function ResetPasswordView() {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordReset, setPasswordReset] = useState(false);
  const [error, setError] = useState('');
  const router = useHistory();
  const resetLink = useResetLink();

  const form = yup.object().shape({
    password: yup
      .string()
      .required('Veuillez renseigner votre nouveau mot de passe.')
      .min(8, 'Au moins 8 caractères.')
      .matches(/[A-Z]/g, {
        name: 'uppercase',
        message: 'Au moins une majuscule.',
      })
      .matches(/[a-z]/g, {
        name: 'lowercase',
        message: 'Au moins une minuscule.',
      })
      .matches(/[0-9]/g, {
        name: 'number',
        message: 'Au moins un chiffre.',
      }),
    passwordConfirmation: yup
      .string()
      .required('Veuillez renseigner votre mot de passe.')
      .oneOf(
        [yup.ref('password')],
        'Les mots de passe doivent être identiques.'
      ),
  });
  const { isValid, message, messageList, messageType } = useForm(form, {
    password,
    passwordConfirmation,
  });

  async function submit(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      if (isValid()) {
        await authService.resetPassword(resetLink.value, password);
        setPasswordReset(true);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!resetLink.exists) {
    return (
      <Container as="main" className="grow-container" spacing="py-4w">
        <Row gutters alignItems="middle">
          <Col>
            <Title as="h1" look="h4">
              Ce lien n’existe pas ou est expiré !
            </Title>
            <Text>Recommencez la procédure ou contactez le support.</Text>
            <Row justifyContent="right">
              <Button onClick={() => router.replace('/')}>
                Revenir à l'accueil
              </Button>
            </Row>
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

  if (passwordReset) {
    return (
      <Container as="main" className="grow-container" spacing="py-4w">
        <Row gutters alignItems="middle">
          <Col>
            <Title as="h1" look="h4">
              Votre mot de passe a été réinitialisé !
            </Title>
            <Text>
              Essayez de vous connecter en utilisant votre nouveau mot de passe.
            </Text>
            <Row justifyContent="right">
              <Button onClick={() => router.push('/connexion')}>
                Se connecter
              </Button>
            </Row>
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

  return (
    <Container as="main" className="grow-container" spacing="py-4w">
      <Row gutters alignItems="middle">
        <Col>
          {error && (
            <Alert
              title="Erreur"
              description="Erreur lors de la mise à jour du mot de passe."
              className="fr-my-3w"
              closable
              type="error"
            />
          )}
          <Title as="h1" look="h2">
            Réinitialisation de votre mot de passe
          </Title>
          <form onSubmit={submit}>
            <TextInput
              value={password}
              type="password"
              hint="Le mot de passe doit contenir 8 caractères avec au moins une majuscule, une minuscule et un chiffre."
              onChange={(e) => setPassword(e.target.value)}
              messageType={messageType('password')}
              label="Créer votre mot de passe : "
              required
            />
            {messageList('password')?.map((message, i) => (
              <p className={`fr-${message.type}-text`} key={i}>
                {message.text}
              </p>
            ))}
            <TextInput
              value={passwordConfirmation}
              type="password"
              className="fr-mt-4w"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPasswordConfirmation(e.target.value)
              }
              messageType={messageType('passwordConfirmation')}
              message={message(
                'passwordConfirmation',
                'Mots de passe identiques.'
              )}
              label="Confirmer votre mot de passe : "
              required
            />
            <Row justifyContent="right">
              <Button disabled={!isValid()} submit>
                Enregistrer le nouveau mot de passe
              </Button>
            </Row>
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

export default ResetPasswordView;
