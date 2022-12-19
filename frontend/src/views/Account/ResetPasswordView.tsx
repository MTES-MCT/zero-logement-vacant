import {
  Button,
  Col,
  Container,
  Row,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';
import React, { ChangeEvent, FormEvent, useState } from 'react';
import building from '../../assets/images/building.svg';
import * as yup from 'yup';
import { useForm } from '../../hooks/useForm';

function ResetPasswordView() {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

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

  function submit(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      if (isValid()) {
        // TODO
      }
    } catch (err) {
      // TODO
    }
  }

  return (
    <Container as="main" spacing="py-4w">
      <Row gutters>
        <Col>
          <Title as="h1" look="h2">
            Réinitialisez votre mot de passe
          </Title>
          <form onSubmit={submit}>
            <TextInput
              value={password}
              type="password"
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
