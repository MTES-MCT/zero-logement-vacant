import { fr } from '@codegouvfr/react-dsfr';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { Navigate, useLocation } from 'react-router-dom';

import styles from '../forgotten-password-view.module.scss';
import { useActivationEmail } from '../../../hooks/useActivationEmail';
import image from '../../../assets/images/fifty-hours.svg';
import Image from '../../../components/Image/Image';

interface State {
  email?: string;
}

function AccountEmailActivationView() {
  const location: { state?: State } = useLocation();
  const { sendActivationEmail } = useActivationEmail();

  function send(): void {
    const { state } = location;
    if (state?.email) {
      sendActivationEmail(state.email);
    }
  }

  if (!location.state?.email) {
    return <Navigate to="/inscription/email" />;
  }

  return (
    <Grid container>
      <Grid xs={7}>
        <Stepper
          currentStep={1}
          stepCount={2}
          title="Créez votre compte"
          nextTitle="Définissez votre mot de passe"
          className={fr.cx('fr-mb-3w')}
        />
        <Typography
          component="h2"
          variant="body1"
          sx={{
            mb: fr.spacing('3v'),
            fontSize: '1.125rem',
            fontWeight: 700,
            lineHeight: '1.75rem'
          }}
        >
          Vous devez désormais vérifier votre adresse e-mail.
        </Typography>
        <Typography sx={{ mb: fr.spacing('3w') }}>
          Pour cela, rendez-vous dans votre boîte de réception, vous avez dû
          recevoir un e-mail de vérification pour vérifier votre identité.
        </Typography>
        <Alert
          className={fr.cx('fr-py-1w')}
          closable={false}
          severity="info"
          small
          description={
            <Typography>
              Si vous ne trouvez pas l’e-mail de validation dans votre boîte de
              réception, vérifiez d’abord que celui-ci n’est pas dans vos spams.
              Autrement,&nbsp;
              <button
                className={classNames(
                  'fr-link',
                  styles.buttonLink,
                  styles.colorInherit
                )}
                onClick={send}
              >
                renvoyez un e-mail de vérification.
              </button>
            </Typography>
          }
        />

        <Button
          className={fr.cx('fr-mt-4w')}
          iconId="fr-icon-arrow-left-line"
          linkProps={{ to: '/inscription/email' }}
          priority="tertiary"
        >
          Revenir à l’étape précédente
        </Button>
      </Grid>

      <Grid
        sx={{
          display: 'flex',
          justifyContent: 'flex-end'
        }}
        xs={4}
        xsOffset={1}
      >
        <Image
          alt="50 heures de travail de travail économisées en utilisant Zéro Logement Vacant"
          responsive="max-width"
          src={image}
        />
      </Grid>
    </Grid>
  );
}

export default AccountEmailActivationView;
