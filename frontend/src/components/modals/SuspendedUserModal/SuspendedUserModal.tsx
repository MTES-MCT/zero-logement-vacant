import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { useEffect, useMemo } from 'react';
import Alert from '@codegouvfr/react-dsfr/Alert';

import { useAppSelector } from '~/hooks/useStore';
import { useIsDsfrReady } from '~/hooks/useIsDsfrReady';

const id = 'suspended-user-modal';
const modal = createModal({
  id,
  isOpenedByDefault: false
});

const PORTAIL_DF_URL = 'https://portaildf.cerema.fr/';

function SuspendedUserModal() {
  const user = useAppSelector((state) => state.authentication.logIn.data);
  const ready = useIsDsfrReady(id);

  const isSuspended = useMemo(() => {
    return user?.user.suspendedAt !== null && user?.user.suspendedAt !== undefined;
  }, [user?.user.suspendedAt]);

  const isUserExpired = useMemo(() => {
    return user?.user.suspendedCause?.includes('droits utilisateur expires');
  }, [user?.user.suspendedCause]);

  const isEstablishmentExpired = useMemo(() => {
    return user?.user.suspendedCause?.includes('droits structure expires');
  }, [user?.user.suspendedCause]);

  const isCguEmpty = useMemo(() => {
    return user?.user.suspendedCause?.includes('cgu vides');
  }, [user?.user.suspendedCause]);

  const isAccessLevelInvalid = useMemo(() => {
    return user?.user.suspendedCause?.includes('niveau_acces_invalide');
  }, [user?.user.suspendedCause]);

  const isPerimeterInvalid = useMemo(() => {
    return user?.user.suspendedCause?.includes('perimetre_invalide');
  }, [user?.user.suspendedCause]);

  const hasMultipleReasons = useMemo(() => {
    const causes = [isCguEmpty, isUserExpired, isEstablishmentExpired, isAccessLevelInvalid, isPerimeterInvalid].filter(Boolean);
    return causes.length > 1;
  }, [isCguEmpty, isUserExpired, isEstablishmentExpired, isAccessLevelInvalid, isPerimeterInvalid]);

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
            title="Vos droits d'accès à Zéro Logement Vacant ne sont plus valides"
            description={
              <Typography>
                {hasMultipleReasons ? (
                  <>
                    Plusieurs problèmes ont été détectés avec vos droits d&apos;accès aux données LOVAC.
                  </>
                ) : isAccessLevelInvalid ? (
                  <>
                    Votre niveau d&apos;accès aux données LOVAC sur le portail Données Foncières du Cerema n&apos;est pas valide.
                  </>
                ) : isPerimeterInvalid ? (
                  <>
                    Votre périmètre géographique sur le portail Données Foncières du Cerema ne correspond pas à votre établissement.
                  </>
                ) : isCguEmpty ? (
                  <>
                    Les conditions générales d&apos;utilisation du portail Données Foncières du Cerema n&apos;ont pas été validées, ce qui limite vos droits d&apos;accès aux données LOVAC.
                  </>
                ) : isUserExpired ? (
                  <>
                    La date d&apos;expiration de vos droits d&apos;accès aux données LOVAC en tant qu&apos;utilisateur a été dépassée.
                  </>
                ) : isEstablishmentExpired ? (
                  <>
                    La date d&apos;expiration des droits d&apos;accès aux données LOVAC de votre structure a été dépassée.
                  </>
                ) : (
                  <>
                    Vos droits d&apos;accès aux données LOVAC ne sont plus valides.
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
                Rendez-vous sur le portail Données Foncières du Cerema pour vérifier vos droits d&apos;accès aux données LOVAC et ceux de votre structure.
                <br />
                Si vous n&apos;avez pas de compte sur le portail Données Foncières du Cerema, vous devez en créer un.
              </>
            ) : isAccessLevelInvalid ? (
              <>
                Rendez-vous sur le portail Données Foncières du Cerema pour vérifier que votre groupe dispose bien d&apos;un accès aux données LOVAC.
                <br />
                Si vous ne pouvez pas modifier votre groupe vous-même, demandez au(x) gestionnaire(s) de votre structure de le faire.
              </>
            ) : isPerimeterInvalid ? (
              <>
                Rendez-vous sur le portail Données Foncières du Cerema pour vérifier que votre périmètre géographique correspond bien à votre établissement.
                <br />
                Si vous ne pouvez pas modifier votre périmètre vous-même, demandez au(x) gestionnaire(s) de votre structure de le faire.
              </>
            ) : isCguEmpty ? (
              <>
                Rendez-vous sur le portail Données Foncières du Cerema pour valider les conditions générales d&apos;utilisation.
                <br />
                Si vous n&apos;avez pas de compte sur le portail Données Foncières du Cerema, vous devez en créer un.
              </>
            ) : isUserExpired ? (
              <>
                Rendez-vous sur le portail Données Foncières du Cerema pour modifier la date d&apos;expiration de vos droits d&apos;accès aux données.
                <br />
                Si vous ne pouvez pas modifier la date vous-même, demandez au(x) gestionnaire(s) de votre structure de le faire.
              </>
            ) : isEstablishmentExpired ? (
              <>
                Rendez-vous sur le portail Données Foncières du Cerema pour renouveler votre demande d&apos;accès aux données LOVAC.
                <br />
                Si vous ne pouvez pas renouveler la demande vous-même, demandez au(x) gestionnaire(s) de votre structure de le faire.
              </>
            ) : (
              <>
                Rendez-vous sur le portail Données Foncières du Cerema pour vérifier vos droits d&apos;accès.
                <br />
                Si vous n&apos;avez pas de compte sur le portail Données Foncières du Cerema, vous devez en créer un.
              </>
            )}
          </Typography>
        </Grid>
      </Grid>
    </modal.Component>
  );
}

export default SuspendedUserModal;
