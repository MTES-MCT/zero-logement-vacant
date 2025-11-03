import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { useEffect, useMemo } from 'react';
import Alert from '@codegouvfr/react-dsfr/Alert';

import { useAuth } from '../../../store/reducers/authenticationReducer';
import { useIsDsfrReady } from '../../../hooks/useIsDsfrReady';

const id = 'suspended-user-modal';
const modal = createModal({
  id,
  isOpenedByDefault: false
});

const PORTAIL_DF_URL = 'https://datafoncier.cerema.fr/portail-des-donnees-foncieres';

const SUSPENSION_REASONS: Record<string, string> = {
  'droits utilisateur expires': 'droits utilisateur expirés',
  'droits structure expires': 'droits de la structure expirés',
  'cgu vides': 'conditions générales d\'utilisation non validées'
};

function formatSuspensionReasons(suspendedCause: string): string {
  const causes = suspendedCause.split(',').map(c => c.trim());
  const formatted = causes
    .map(cause => SUSPENSION_REASONS[cause] || cause)
    .join(', ');
  return formatted;
}

function SuspendedUserModal() {
  const { user } = useAuth();
  const ready = useIsDsfrReady(id);

  const isSuspended = useMemo(() => {
    return user?.suspendedAt !== null && user?.suspendedAt !== undefined;
  }, [user?.suspendedAt]);

  const suspensionMessage = useMemo(() => {
    if (!user?.suspendedCause) {
      return 'droits d\'accès expirés';
    }
    return formatSuspensionReasons(user.suspendedCause);
  }, [user?.suspendedCause]);

  useEffect(() => {
    if (ready && isSuspended) {
      modal.open();
    }
  }, [isSuspended, ready]);

  if (!isSuspended) {
    return null;
  }

  return (
    <modal.Component
      concealingBackdrop={true}
      size="large"
      title="Accès suspendu"
      buttons={[
        {
          children: 'Accéder au Portail des Données Foncières',
          linkProps: {
            href: PORTAIL_DF_URL,
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }
      ]}
    >
      <Grid container rowSpacing={3}>
        <Grid component="section" size={12}>
          <Alert
            severity="error"
            title="Vos droits d'accès à Zéro Logement Vacant ne sont plus valides"
            description={
              <Typography>
                Vos droits d'accès à Zéro Logement Vacant ne sont plus valides
                en raison de <strong>{suspensionMessage}</strong>.
              </Typography>
            }
          />
        </Grid>

        <Grid component="section" size={12}>
          <Typography sx={{ mb: 2 }}>
            Veuillez vous rendre sur le{' '}
            <a
              href={PORTAIL_DF_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Portail des Données Foncières
            </a>{' '}
            pour vous mettre en conformité.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Une fois vos droits rétablis sur le Portail des Données Foncières,
            vous pourrez à nouveau accéder à Zéro Logement Vacant.
          </Typography>
        </Grid>
      </Grid>
    </modal.Component>
  );
}

export default SuspendedUserModal;
