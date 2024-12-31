import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dsfr: any;
  }
}
import { useEffect } from 'react';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import { useIsDsfrReady } from '../../../hooks/useIsDsfrReady';
import image from '../../../assets/images/community.svg';

const id = 'onboarding-modal';
const modal = createModal({
  id,
  isOpenedByDefault: false
});

function OnboardingModal() {
  const location = useLocation();
  const onboarding: boolean = location.state?.onboarding ?? false;

  const ready = useIsDsfrReady();

  useEffect(() => {
    if (ready && onboarding && modal) {
      // Dirty hack to provide a larger modal
      document
        .getElementById(id)
        ?.querySelector('.fr-col-lg-8')
        ?.classList?.remove('fr-col-lg-8');
      modal.open();
    }
  }, [onboarding, ready]);

  return (
    <modal.Component size="large" title="Bienvenue sur Zéro Logement Vacant !">
      <Grid container rowSpacing={3}>
        <Grid component="section" sx={{ display: 'inline-flex' }} xs={12}>
          <img src={image} alt="Communauté" aria-hidden="true" />
          <Typography sx={{ ml: 1 }} variant="subtitle2">
            Pour prendre en main rapidement ZLV, inscrivez-vous à une session de
            prise en main (1h) afin de découvrir les principales fonctionnalités
            de la plateforme. Cette inscription est optionnelle, mais
            recommandée.
          </Typography>
        </Grid>

        <Grid
          component="section"
          sx={{ display: 'flex', justifyContent: 'center' }}
          xs={12}
        >
          <iframe
            width="75%"
            height="600"
            src="https://app.livestorm.co/p/1b26afab-3332-4b6d-a9e4-3f38b4cc6c43/form"
          />
        </Grid>
      </Grid>
    </modal.Component>
  );
}

export default OnboardingModal;
