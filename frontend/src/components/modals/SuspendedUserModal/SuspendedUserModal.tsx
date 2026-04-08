import Alert from '@codegouvfr/react-dsfr/Alert';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';

import { useModalReady } from '~/hooks/useModalReady';
import { useAppSelector } from '~/hooks/useStore';

const id = 'suspended-user-modal';
const modal = createModal({
  id,
  isOpenedByDefault: false
});

const PORTAIL_DF_URL = 'https://portaildf.cerema.fr/';

function SuspendedUserModal() {
  const user = useAppSelector((state) => state.authentication.logIn.data);
  const ready = useModalReady(id);

  const isSuspended =
    user?.user.suspendedAt !== null && user?.user.suspendedAt !== undefined;

  const isUserExpired = user?.user.suspendedCause?.includes(
    'droits utilisateur expires'
  );

  const isEstablishmentExpired = user?.user.suspendedCause?.includes(
    'droits structure expires'
  );

  const isCguEmpty = user?.user.suspendedCause?.includes('cgu vides');

  const hasMultipleReasons =
    [isCguEmpty, isUserExpired, isEstablishmentExpired].filter(Boolean).length >
    1;

  useEffect(() => {
    if (ready && isSuspended) {
      modal.open();
    }
  }, [isSuspended, ready]);

  return (
    <modal.Component
      concealingBackdrop={true}
      size="large"
      title="Accès non autorisé"
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
            title="Vos droits d’accès à Zéro Logement Vacant ne sont plus valides"
            description={
              <Typography>
                {hasMultipleReasons ? (
                  <>
                    La date d&apos;expiration de vos droits d&apos;accès aux
                    données LOVAC en tant qu&apos;utilisateur ou ceux de votre
                    structure a été dépassée.
                  </>
                ) : isCguEmpty ? (
                  <>
                    Les conditions générales d&apos;utilisation du portail
                    Données Foncières du Cerema n&apos;ont pas été validées, ce
                    qui limite vos droits d&apos;accès aux données LOVAC.
                  </>
                ) : isUserExpired ? (
                  <>
                    La date d&apos;expiration de vos droits d&apos;accès aux
                    données LOVAC en tant qu&apos;utilisateur a été dépassée.
                  </>
                ) : (
                  <>
                    La date d&apos;expiration des droits d&apos;accès aux
                    données LOVAC de votre structure a été dépassée.
                  </>
                )}
              </Typography>
            }
          />
        </Grid>

        <Grid component="section" size={12}>
          <Typography sx={{ mb: 2 }}>
            {hasMultipleReasons ? (
              <>
                Rendez-vous sur le portail Données Foncières du Cerema pour
                vérifier vos droits d’accès aux données LOVAC et ceux de votre
                structure.
                <br />
                Si vous n’avez pas de compte sur le portail Données Foncières du
                Cerema, vous devez en créer un.
              </>
            ) : isCguEmpty ? (
              <>
                Rendez-vous sur le portail Données Foncières du Cerema pour
                valider les conditions générales d’utilisation.
                <br />
                Si vous n’avez pas de compte sur le portail Données Foncières du
                Cerema, vous devez en créer un.
              </>
            ) : isUserExpired ? (
              <>
                Rendez-vous sur le portail Données Foncières du Cerema pour
                modifier la date d’expiration de vos droits d’accès aux données.
                <br />
                Si vous ne pouvez pas modifier la date vous-même, demandez au(x)
                gestionnaire(s) de votre structure de le faire.
              </>
            ) : (
              <>
                Rendez-vous sur le portail Données Foncières du Cerema pour
                renouveler votre demande d’accès aux données LOVAC.
                <br />
                Si vous ne pouvez pas renouveler la demande vous-même, demandez
                au(x) gestionnaire(s) de votre structure de le faire.
              </>
            )}
          </Typography>
        </Grid>
      </Grid>
    </modal.Component>
  );
}

export default SuspendedUserModal;
