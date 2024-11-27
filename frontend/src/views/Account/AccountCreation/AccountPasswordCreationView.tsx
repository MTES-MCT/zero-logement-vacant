import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom-v5-compat';
import * as yup from 'yup';
import {
  passwordConfirmationValidator,
  passwordFormatValidator,
  useForm
} from '../../../hooks/useForm';
import { Row, Text } from '../../../components/_dsfr';
import AppLink from '../../../components/_app/AppLink/AppLink';
import { useProspect } from '../../../hooks/useProspect';
import { Prospect } from '../../../models/Prospect';
import AppTextInput from '../../../components/_app/AppTextInput/AppTextInput';
import Button from '@codegouvfr/react-dsfr/Button';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import {
  TrackEventActions,
  TrackEventCategories
} from '../../../models/TrackEvent';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import Typography from '@mui/material/Typography';

interface RouterState {
  prospect?: Prospect | undefined;
  password?: string;
}

function AccountPasswordCreationView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useMatomo();

  const { linkExists, loading, prospect } = useProspect(
    location.state?.prospect
  );

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    form.validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const shape = {
    password: yup.string().required('Veuillez renseigner votre mot de passe.'),
    passwordFormat: passwordFormatValidator,
    confirmation: passwordConfirmationValidator
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    password,
    passwordFormat: password,
    confirmation
  });

  if (loading) {
    return null;
  }

  if (!linkExists) {
    return (
      <>
        <Typography component="h1" variant="h4" mb={3}>
          Ce lien n’existe pas ou est expiré !
        </Typography>
        <Text>Recommencez la procédure ou contactez le support.</Text>
        <Row>
          <AppLink
            iconId="fr-icon-home-4-fill"
            iconPosition="left"
            isSimple
            to="/"
          >
            Revenir à l’accueil
          </AppLink>
        </Row>
      </>
    );
  }

  if (prospect) {
    if (prospect.hasAccount && !prospect.hasCommitment) {
      return <Navigate to="en-attente" />;
    }
    if (
      !prospect.establishment ||
      (!prospect.hasAccount && !prospect.hasCommitment)
    ) {
      return <Navigate to="impossible" />;
    }
  }

  async function next(e: FormEvent) {
    e.preventDefault();
    await form.validate(() => {
      if (prospect) {
        trackEvent({
          category: TrackEventCategories.AccountCreation,
          action: TrackEventActions.AccountCreation.SubmitPassword
        });
        navigate('/inscription/campagne', {
          state: {
            prospect,
            password
          }
        });
      }
    });
  }

  return (
    <>
      <Stepper
        stepCount={3}
        currentStep={2}
        title="Créer votre mot de passe"
        nextTitle="Intentions opérationnelles"
      />
      <form onSubmit={next}>
        <AppTextInput<FormShape>
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          inputForm={form}
          inputKey="password"
          label="Créer votre mot de passe (obligatoire)"
          hintText="Le mot de passe doit contenir 8 caractères avec au moins une majuscule, une minuscule et un chiffre."
          required
        />
        {form.messageList('passwordFormat')?.map((message, i) => (
          <p className={`fr-${message.type}-text`} key={i}>
            {message.text}
          </p>
        ))}
        <AppTextInput<FormShape>
          type="password"
          className="fr-mt-3w"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          inputForm={form}
          inputKey="confirmation"
          whenValid="Mots de passe identiques."
          label="Confirmer votre mot de passe (obligatoire)"
          required
        />
        <Row alignItems="middle" className="justify-space-between">
          <AppLink
            isSimple
            to="/inscription/email"
            iconId="fr-icon-arrow-left-line"
            iconPosition="left"
          >
            Revenir à l’étape précédente
          </AppLink>
          <Button type="submit">Continuer</Button>
        </Row>
      </form>
    </>
  );
}

export default AccountPasswordCreationView;
