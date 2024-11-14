import { fr } from '@codegouvfr/react-dsfr';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

import { formatAddress } from '@zerologementvacant/models';
import { HousingOwner, Owner } from '../../models/Owner';
import { age, birthdate } from '../../utils/dateUtils';
import { mailto } from '../../utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';
import styles from './owner-card.module.scss';
import { isBanEligible } from '../../models/Address';
import OtherOwnerCard from './OtherOwnerCard';
import LabelNext from '../Label/LabelNext';

interface OwnerCardProps {
  owner: Owner | HousingOwner;
  coOwners?: HousingOwner[];
  housingCount: number;
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
        <Grid xs>
          <Typography component="h2" variant="h4" mb={0} data-testid="fullName">
            {props.owner.fullName}
          </Typography>
          <Typography>Propriétaire principal</Typography>
        </Grid>
        <Grid xs="auto">{props.modify}</Grid>
      </Grid>
      <Grid component="section" container rowSpacing={1}>
        {props.owner.birthDate ? (
          <Grid xs={12}>
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
            <Typography>{birthdate(props.owner.birthDate)} ({age(props.owner.birthDate)} ans)</Typography>
          </Grid>
        ) : null}

        <Grid xs={12}>
          <LabelNext component="h3">
            <span
              className={fr.cx(
                'fr-icon-bank-line',
                'fr-icon--sm',
                'fr-mr-1w'
              )}
              aria-hidden={true}
            />
            Adresse fiscale (source: DGFIP)
          </LabelNext>
          <Typography>{props.owner.rawAddress ? props.owner.rawAddress : 'Inconnue'}</Typography>
        </Grid>


        <Grid xs={12}>
          <LabelNext component="h3">
            <span
              className={fr.cx(
                'fr-icon-home-4-line',
                'fr-icon--sm',
                'fr-mr-1w'
              )}
              aria-hidden={true}
            />
            Adresse postale (source: BAN)
          </LabelNext>
          <Typography>{props.owner.banAddress ? formatAddress(props.owner.banAddress) :  'Inconnue'}</Typography>
        </Grid>


        {!isBanEligible(props.owner.banAddress) && (
          <Grid xs={12}>
            <Alert
              severity="info"
              classes={{ title: fr.cx('fr-mb-2w') }}
              description={
                <>
                  <Typography>
                    L’adresse Base Adresse Nationale ne correspond pas à celle de la DGFIP.
                  </Typography>
                  <Typography>
                    Nous vous recommandons de vérifier en cliquant sur &quot;Modifier&quot;.
                  </Typography>
                </>
              }
            />
          </Grid>
        )}

        {props.owner.additionalAddress ? (
          <Grid xs={12}>
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
          <Grid xs={12}>
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
              <AppLink
                className="mailto"
                isSimple
                to={mailto(props.owner.email)}
              >
                {props.owner.email}
              </AppLink>
            </Typography>
          </Grid>
        ) : null}

        {props.owner.phone ? (
          <Grid xs={12}>
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

        {props.housingCount > 0 ? (
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
          <Typography component="h2" variant="h6" mb={1} mt={4}>
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
