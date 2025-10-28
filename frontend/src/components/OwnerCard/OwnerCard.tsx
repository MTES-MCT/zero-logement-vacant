import { fr } from '@codegouvfr/react-dsfr';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';

import { formatAddress } from '@zerologementvacant/models';
import type { ReactNode } from 'react';
import { isBanEligible } from '../../models/Address';
import type { HousingOwner, Owner } from '../../models/Owner';
import { age, birthdate } from '../../utils/dateUtils';
import { mailto } from '../../utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';
import LabelNext from '../Label/LabelNext';
import OtherOwnerCard from './OtherOwnerCard';
import styles from './owner-card.module.scss';

interface OwnerCardProps {
  owner: Owner | HousingOwner;
  coOwners?: HousingOwner[];
  housingCount: number | undefined;
  modify?: ReactNode;
}

function OwnerCard(props: OwnerCardProps) {
  const secondaryOwners =
    props.coOwners?.filter((owner) => owner.rank > 1) ?? [];
  const archivedOwners =
    props.coOwners?.filter((owner) => owner.rank <= 0) ?? [];

  return (
    <Paper component="article" elevation={0} sx={{ padding: 3 }}>
      <Grid component="header" container sx={{ mb: 1 }}>
        <Grid size="grow">
          <Typography component="h2" variant="h4" mb={0} data-testid="fullName">
            {props.owner.fullName}
          </Typography>
          <Typography>Propriétaire principal</Typography>
        </Grid>
        <Grid size="auto">{props.modify}</Grid>
      </Grid>
      <Grid component="section" container rowSpacing={1}>
        {props.owner.birthDate ? (
          <Grid size={12}>
            <LabelNext component="h3">
              <span
                className={fr.cx(
                  'fr-icon-calendar-2-line',
                  'fr-icon--sm',
                  'fr-mr-1w'
                )}
                aria-hidden={true}
              />
              Date de naissance
            </LabelNext>
            <Typography>
              {birthdate(props.owner.birthDate)} ({age(props.owner.birthDate)}{' '}
              ans)
            </Typography>
          </Grid>
        ) : null}

        <Grid size={12}>
          <LabelNext component="h3">
            <span
              className={fr.cx('fr-icon-bank-line', 'fr-icon--sm', 'fr-mr-1w')}
              aria-hidden={true}
            />
            Adresse fiscale (source: DGFIP)
          </LabelNext>
          <Typography color={fr.colors.decisions.text.default.grey.default}>
            {props.owner.rawAddress
              ? props.owner.rawAddress.join(' ')
              : 'Inconnue'}
          </Typography>
        </Grid>

        <Grid size={12}>
          <LabelNext component="h3">
            <span
              className={fr.cx(
                'fr-icon-home-4-line',
                'fr-icon--sm',
                'fr-mr-1w'
              )}
              aria-hidden={true}
            />
            Adresse postale (source: Base Adresse Nationale)
          </LabelNext>
          <Typography>
            {props.owner.banAddress
              ? formatAddress(props.owner.banAddress).join(' ')
              : 'Non renseigné'}
          </Typography>
        </Grid>

        {!isBanEligible(props.owner.banAddress) && (
          <Grid size={12}>
            <Alert
              severity="info"
              classes={{ title: fr.cx('fr-mb-2w') }}
              small
              description={
                <>
                  <Typography>
                    L’adresse Base Adresse Nationale ne correspond pas à celle
                    de la DGFIP.
                  </Typography>
                  <Typography>
                    Nous vous recommandons de vérifier en cliquant sur
                    &quot;Modifier&quot;.
                  </Typography>
                </>
              }
            />
          </Grid>
        )}

        {props.owner.additionalAddress ? (
          <Grid size={12}>
            <LabelNext component="h3">
              <span
                className={fr.cx(
                  'fr-icon-home-4-line',
                  'fr-icon--sm',
                  'fr-mr-1w'
                )}
                aria-hidden={true}
              />
              Complément d’adresse
            </LabelNext>
            <Typography>{props.owner.additionalAddress}</Typography>
          </Grid>
        ) : null}

        {props.owner.email ? (
          <Grid size={12}>
            <LabelNext component="h3">
              <span
                className={fr.cx(
                  'fr-icon-mail-line',
                  'fr-icon--sm',
                  'fr-mr-1w'
                )}
                aria-hidden={true}
              />
              Adresse mail
            </LabelNext>
            <Typography>
              <AppLink isSimple to={mailto(props.owner.email)}>
                {props.owner.email}
              </AppLink>
            </Typography>
          </Grid>
        ) : null}

        {props.owner.phone ? (
          <Grid size={12}>
            <LabelNext component="h3">
              <span
                className={fr.cx(
                  'fr-icon-phone-line',
                  'fr-icon--sm',
                  'fr-mr-1w'
                )}
                aria-hidden={true}
              />
              Téléphone
            </LabelNext>
            <Typography>{props.owner.phone}</Typography>
          </Grid>
        ) : null}

        {props.housingCount ? (
          <Button
            title="Voir tous ses logements"
            priority="secondary"
            linkProps={{
              to: `/proprietaires/${props.owner.id}`
            }}
            className={styles.housingBouton}
          >
            Voir tous ses logements ({props.housingCount})
          </Button>
        ) : null}
      </Grid>
      {secondaryOwners && secondaryOwners?.length > 0 && (
        <>
          <Typography component="h2" variant="h6" mb={1} mt={4}>
            Propriétaires secondaires ({secondaryOwners.length})
          </Typography>
          <hr />
          {secondaryOwners.map((housingOwner) => (
            <OtherOwnerCard owner={housingOwner} key={housingOwner.id} />
          ))}
        </>
      )}
      {archivedOwners && archivedOwners.length > 0 && (
        <>
          <Typography component="h2" variant="h6" sx={{ mb: '0.5rem' }}>
            Propriétaires archivés ({archivedOwners.length})
          </Typography>
          <hr />
          {archivedOwners.map((housingOwner) => (
            <OtherOwnerCard owner={housingOwner} key={housingOwner.id} />
          ))}
        </>
      )}
    </Paper>
  );
}

export default OwnerCard;
