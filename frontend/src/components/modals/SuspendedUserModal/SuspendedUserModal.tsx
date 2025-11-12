import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { useEffect, useMemo } from 'react';
import Alert from '@codegouvfr/react-dsfr/Alert';
import type { SuspendedCause } from '@zerologementvacant/models';

import { useAppSelector } from '~/hooks/useStore';
import { useIsDsfrReady } from '~/hooks/useIsDsfrReady';

const id = 'suspended-user-modal';
const modal = createModal({
  id,
  isOpenedByDefault: false
});

const PORTAIL_DF_URL = 'https://portaildf.cerema.fr/';

const SUSPENSION_REASONS: Record<SuspendedCause, string> = {
  'droits utilisateur expires': 'droits utilisateur expirés',
  'droits structure expires': 'droits de la structure expirés',
  'cgu vides': 'conditions générales d\'utilisation non validées'
} as const;

function formatSuspensionReasons(suspendedCause: string): string {
  const causes = suspendedCause.split(',').map(c => c.trim()) as SuspendedCause[];
  const formatted = causes
    .map(cause => SUSPENSION_REASONS[cause] ?? cause)
    .join(', ');
  return formatted;
}

function SuspendedUserModal() {
  const user = useAppSelector((state) => state.authentication.logIn.data);
  const ready = useIsDsfrReady(id);

  const isSuspended = useMemo(() => {
    return user?.user.suspendedAt !== null && user?.user.suspendedAt !== undefined;
  }, [user?.user.suspendedAt]);

  const suspensionMessage = useMemo(() => {
    if (!user?.user.suspendedCause) {
      return 'droits d\'accès expirés';
    }
    return formatSuspensionReasons(user.user.suspendedCause);
  }, [user]);

  const isUserExpired = useMemo(() => {
    return user?.user.suspendedCause?.includes('droits utilisateur expires');
  }, [user?.user.suspendedCause]);

  const isEstablishmentExpired = useMemo(() => {
    return user?.user.suspendedCause?.includes('droits structure expires');
  }, [user?.user.suspendedCause]);

  const isCguEmpty = useMemo(() => {
    return user?.user.suspendedCause?.includes('cgu vides');
  }, [user?.user.suspendedCause]);

  const hasMultipleReasons = useMemo(() => {
    const causes = [isCguEmpty, isUserExpired, isEstablishmentExpired].filter(Boolean);
    return causes.length > 1;
  }, [isCguEmpty, isUserExpired, isEstablishmentExpired]);

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
                {hasMultipleReasons ? (
                  <>
                    La date d'expiration de vos droits d'accès aux données LOVAC en tant qu'utilisateur ou ceux de votre structure a été dépassée.
                    <br /><br />
                    Rendez-vous sur le portail Données Foncières du Cerema pour vérifier vos droits d'accès aux données LOVAC et ceux de votre structure.
                    <br /><br />
                    Si vous n'avez pas de compte sur le portail Données Foncières du Cerema, vous devez en créer un.
                  </>
                ) : isCguEmpty ? (
                  <>
                    Les conditions générales d'utilisation du portail Données Foncières du Cerema n'ont pas été validées, ce qui limite vos droits d'accès aux données LOVAC.
                    <br /><br />
                    Rendez-vous sur le portail Données Foncières du Cerema pour valider les conditions générales d'utilisation.
                    <br /><br />
                    Si vous n'avez pas de compte sur le portail Données Foncières du Cerema, vous devez en créer un.
                  </>
                ) : isUserExpired ? (
                  <>
                    La date d'expiration de vos droits d'accès aux données LOVAC en tant qu'utilisateur a été dépassée.
                    <br /><br />
                    Rendez-vous sur le portail Données Foncières du Cerema pour modifier la date d'expiration de vos droits d'accès aux données.
                    <br /><br />
                    Si vous ne pouvez pas modifier la date vous-même, demandez au(x) gestionnaire(s) de votre structure de le faire.
                  </>
                ) : (
                  <>
                    La date d'expiration des droits d'accès aux données LOVAC de votre structure a été dépassée.
                    <br /><br />
                    Rendez-vous sur le portail Données Foncières du Cerema pour renouveler votre demande d'accès aux données LOVAC.
                    <br /><br />
                    Si vous ne pouvez pas renouveler la demande vous-même, demandez au(x) gestionnaire(s) de votre structure de le faire.
                  </>
                )}
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
