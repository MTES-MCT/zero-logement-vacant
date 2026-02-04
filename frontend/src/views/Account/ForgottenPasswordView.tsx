import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { yupResolver } from '@hookform/resolvers/yup';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { type InferType, object } from 'yup';

import building from '~/assets/images/building.svg';
import AppLinkAsButton from '~/components/_app/AppLinkAsButton/AppLinkAsButton';
import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import { Col, Container, Row, Text } from '../../components/_dsfr';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { emailValidator } from '~/hooks/useForm';
import { useHide } from '~/hooks/useHide';
import resetLinkService from '~/services/reset-link.service';
import styles from './forgotten-password-view.module.scss';

interface EmailSentProps {
  hidden?: boolean;
  submit?(): void;
}

function EmailSent(props: EmailSentProps) {
  const confirmationClasses = classNames('fr-valid-text', {
    [styles.hidden]: props.hidden
  });

  return (
    <>
      <Text>Un email vous a été envoyé avec les instructions à suivre.</Text>
      <Text className="subtitle">
        Vous ne trouvez pas le mail ? Vérifiez qu’il ne s’est pas glissé dans
        vos spams ou 
        <AppLinkAsButton
          isSimple
          onClick={() => {
            props.submit?.();
          }}
        >
          renvoyer le mail
        </AppLinkAsButton>
        .
      </Text>
      <Text size="sm" className={confirmationClasses}>
        Email envoyé.
      </Text>
    </>
  );
}

const schema = object({
  email: emailValidator
});

type FormValues = InferType<typeof schema>;

function ForgottenPasswordView() {
  useDocumentTitle('Mot de passe oublié');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const { hidden, setHidden } = useHide();

  const form = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: ''
    },
    mode: 'onBlur'
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      await resetLinkService.sendResetEmail(data.email);
      setEmailSent(true);
      setHidden(false);
      form.reset(); // Reset form after successful submission
    } catch (err) {
      setError((err as Error).message);
    }
  };

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
          <Typography component="h1" variant="h4" mb={3}>
            Réinitialisation de votre mot de passe
          </Typography>
          {emailSent ? (
            <EmailSent hidden={hidden} submit={form.handleSubmit(onSubmit)} />
          ) : (
            <>
              <Text>
                Vous allez <b>recevoir un email</b> qui vous permettra de créer
                un nouveau mot de passe.
              </Text>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <AppTextInputNext<FormValues>
                  name="email"
                  hintText="Entrez l'adresse mail utilisée pour créer votre compte ZLV"
                  control={form.control}
                  data-testid="email-input"
                  label="Adresse email (obligatoire)"
                  nativeInputProps={{
                    type: 'email',
                    placeholder: 'exemple@gmail.com'
                  }}
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
