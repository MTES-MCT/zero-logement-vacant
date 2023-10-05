import { Col, Container, Row, Text, Title } from '../../components/dsfr/index';
import building from '../../assets/images/building.svg';
import React, { useState } from 'react';
import * as yup from 'yup';
import { emailValidator, useForm } from '../../hooks/useForm';
import resetLinkService from '../../services/reset-link.service';
import classNames from 'classnames';
import styles from './forgotten-password-view.module.scss';
import { useHide } from '../../hooks/useHide';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import AppTextInput from '../../components/AppTextInput/AppTextInput';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import ButtonLink from '../../components/ButtonLink/ButtonLink';

function ForgottenPasswordView() {
  useDocumentTitle('Mot de passe oublié');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const shape = {
    email: emailValidator,
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    email,
  });
  const { hidden, setHidden } = useHide();

  async function submit(e?: any) {
    try {
      e?.preventDefault();
      await form.validate(async () => {
        await resetLinkService.sendResetEmail(email);
        setEmailSent(true);
        setHidden(false);
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function EmailSent() {
    const confirmationClasses = classNames('fr-valid-text', {
      [styles.hidden]: hidden,
    });

    return (
      <>
        <Text>Un email vous a été envoyé avec les instructions à suivre.</Text>
        <Text className="subtitle">
          Vous ne trouvez pas le mail ? Vérifiez qu'il ne s'est pas glissé dans
          vos spams ou 
          <ButtonLink isSimple onClick={submit}>
            renvoyer le mail
          </ButtonLink>
          .
        </Text>
        <Text size="sm" className={confirmationClasses}>
          Email envoyé.
        </Text>
      </>
    );
  }

  return (
    <Container as="main" spacing="py-4w" className="grow-container">
      <Row gutters alignItems="middle">
        <Col>
          {error && (
            <Alert
              title="Erreur"
              description="Impossible d'envoyer l'email."
              className="fr-my-3w"
              closable
              severity="error"
            />
          )}
          <Title as="h1" look="h4">
            Réinitialisation de votre mot de passe
          </Title>
          {emailSent ? (
            <EmailSent />
          ) : (
            <>
              <Text>
                Vous allez <b>recevoir un email</b> qui vous permettra de créer
                un nouveau mot de passe.
              </Text>
              <form onSubmit={submit}>
                <AppTextInput<FormShape>
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  hintText="Entrez l’adresse mail utilisée pour créer votre compte ZLV"
                  inputForm={form}
                  inputKey="email"
                  whenValid="Email valide."
                  data-testid="email-input"
                  label="Adresse email (obligatoire)"
                  placeholder="exemple@gmail.com"
                  required
                />
                <Row justifyContent="right">
                  <Button type="submit">
                    Envoyer un email de réinitialisation
                  </Button>
                </Row>
              </form>
            </>
          )}
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
