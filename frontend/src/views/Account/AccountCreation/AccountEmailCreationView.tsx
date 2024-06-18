import { Container, Row, Text } from '../../../components/_dsfr';
import { FormEvent, useState } from 'react';
import { useHistory } from 'react-router-dom';
import * as yup from 'yup';

import { emailValidator, useForm } from '../../../hooks/useForm';
import AppLink from '../../../components/_app/AppLink/AppLink';
import { useActivationEmail } from '../../../hooks/useActivationEmail';
import styles from './account-email-creation-view.module.scss';
import AppTextInput from '../../../components/_app/AppTextInput/AppTextInput';
import Button from '@codegouvfr/react-dsfr/Button';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import {
  TrackEventActions,
  TrackEventCategories
} from '../../../models/TrackEvent';
import Typography from '@mui/material/Typography';

function AccountEmailCreationView() {
  const [email, setEmail] = useState('');
  const router = useHistory();
  const { send: sendActivationEmail } = useActivationEmail();
  const { trackEvent } = useMatomo();

  const shape = { email: emailValidator };
  type FormShape = typeof shape;
  const form = useForm(yup.object().shape(shape), { email });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await form.validate(async () => {
      await sendActivationEmail(email);
      trackEvent({
        category: TrackEventCategories.AccountCreation,
        action: TrackEventActions.AccountCreation.SendEmail
      });
      return router.push({
        pathname: '/inscription/activation',
        state: {
          email
        }
      });
    });
  }

  return (
    <form onSubmit={submit}>
      <Typography component="h2">Créer votre compte</Typography>
      <Text size="lead">
        Pour créer votre compte sur Zéro Logement Vacant, vous devez
        impérativement avoir déjà signé l’acte d’engagement permettant d’accéder
        aux données LOVAC via la procédure indiquée sur le site du Cerema.
      </Text>
      <Container as="section" fluid>
        <Row justifyContent="right">
          <AppLink
            className={styles.help}
            to="https://zerologementvacant.crisp.help/fr/article/comment-creer-mon-compte-zlv-1bcsydq"
            isSimple
            size="sm"
            target="_blank"
          >
            Besoin d’aide pour créer votre compte ?
          </AppLink>
        </Row>
      </Container>
      <AppTextInput<FormShape>
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        inputForm={form}
        inputKey="email"
        whenValid="Email valide."
        placeholder="example@gmail.com"
        label="Adresse email (obligatoire)"
        hintText="Veuillez renseigner l’adresse utilisée sur Démarches Simplifiées pour transmettre l’acte d'engagement."
        required
      />
      <Row alignItems="middle" className="justify-space-between">
        <AppLink
          iconId="fr-icon-arrow-left-line"
          iconPosition="left"
          isSimple
          to="/"
        >
          Revenir à l’écran d’accueil
        </AppLink>
        <Button type="submit">Continuer</Button>
      </Row>
    </form>
  );
}

export default AccountEmailCreationView;
