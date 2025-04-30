import { fr, FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import {
  formatAddress,
  isInactiveOwnerRank,
  isSecondaryOwner
} from '@zerologementvacant/models';
import { ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';
import { isBanEligible } from '../../models/Address';
import { HousingOwner, Owner } from '../../models/Owner';
import { useFindOwnersByHousingQuery } from '../../services/owner.service';
import { age, birthdate } from '../../utils/dateUtils';
import { mailto } from '../../utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';
import LabelNext from '../Label/LabelNext';
import OtherOwnerCard from './OtherOwnerCard';
import styles from './owner-card.module.scss';

interface OwnerCardProps {
  housingId: string;
  owner: Owner | HousingOwner;
  coOwners?: HousingOwner[];
  housingCount: number;
  modify?: ReactNode;
}

function OwnerCard(props: OwnerCardProps) {
  const findHousingOwnersQuery = useFindOwnersByHousingQuery(props.housingId);

  const secondaryOwners = findHousingOwnersQuery.data?.filter(isSecondaryOwner);
  const archivedOwners = findHousingOwnersQuery.data?.filter((owner) =>
    isInactiveOwnerRank(owner.rank)
  );

  return (
    <Stack component="section" spacing="1.5rem">
      <Stack
        component="header"
        direction="row"
        sx={{ justifyContent: 'space-between', mt: '0.5rem' }}
      >
        <Typography component="h2" variant="h5">
          Propriétaires
        </Typography>
        <Button iconId="fr-icon-edit-fill" priority="tertiary">
          Modifier
        </Button>
      </Stack>

      <Stack component="article" spacing="0.75rem">
        <Stack component="header">
          <Typography component="h3" variant="h6" sx={{ mb: '0.5rem' }}>
            Propriétaire principal
          </Typography>
          <hr className="fr-pb-1v" />
        </Stack>

        <OwnerAttribute
          icon="fr-icon-user-fill"
          label="Nom et prénom"
          value={<Typography>{props.owner.fullName}</Typography>}
        />

        <OwnerAttribute
          icon="fr-icon-calendar-2-line"
          label="Date de naissance"
          value={
            !props.owner.birthDate ? null : (
              <Typography>
                {birthdate(props.owner.birthDate)} ({age(props.owner.birthDate)}
                &nbsp;ans)
              </Typography>
            )
          }
        />

        <OwnerAttribute
          icon="fr-icon-bank-line"
          label="Adresse fiscale (source : DGFIP)"
          value={
            !props.owner.rawAddress ? null : (
              <Typography>{props.owner.rawAddress.join(', ')}</Typography>
            )
          }
        />

        <OwnerAttribute
          icon="fr-icon-home-4-line"
          label="Adresse postale (source : BAN)"
          value={
            !props.owner.banAddress
              ? null
              : formatAddress(props.owner.banAddress).join(', ')
          }
        />

        {!isBanEligible(props.owner.banAddress) && (
          <Alert
            severity="info"
            classes={{ title: fr.cx('fr-mb-2w') }}
            description={
              <>
                <Typography>
                  L’adresse Base Adresse Nationale ne correspond pas à celle de
                  la DGFIP.
                </Typography>
                <Typography>
                  Nous vous recommandons de vérifier en cliquant sur
                  &quot;Modifier&quot;.
                </Typography>
              </>
            }
          />
        )}

        <OwnerAttribute
          icon="fr-icon-home-4-line"
          label="Complément d’adresse"
          value={
            !props.owner.additionalAddress ? null : (
              <Typography>{props.owner.additionalAddress}</Typography>
            )
          }
        />

        <OwnerAttribute
          icon="fr-icon-mail-line"
          label="Adresse e-mail"
          value={
            !props.owner.email ? null : (
              <Typography>
                <AppLink
                  className="mailto"
                  isSimple
                  to={mailto(props.owner.email)}
                >
                  {props.owner.email}
                </AppLink>
              </Typography>
            )
          }
        />

        <OwnerAttribute
          icon="fr-icon-phone-line"
          label="Téléphone"
          value={
            !props.owner.phone ? null : (
              <Typography>{props.owner.phone}</Typography>
            )
          }
        />

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
      </Stack>

      <Stack component="article">
        <Typography component="h3" variant="h6" sx={{ mb: '0.5rem' }}>
          Propriétaires secondaires (
          {secondaryOwners ? secondaryOwners.length : '...'})
        </Typography>
        <hr />
        {match(findHousingOwnersQuery)
          .returnType<ReactNode>()
          .with({ isLoading: true }, () => (
            <Skeleton animation="wave" width="100%" height="20rem" />
          ))
          .with(
            { data: Pattern.nonNullable, isLoading: false },
            ({ data: housingOwners }) =>
              housingOwners
                .filter(isSecondaryOwner)
                .map((housingOwner) => (
                  <OtherOwnerCard owner={housingOwner} key={housingOwner.id} />
                ))
          )
          .otherwise(() => null)}
      </Stack>

      <Stack component="article">
        <Typography component="h2" variant="h6" mb={1} mt={4}>
          Propriétaires archivés (
          {archivedOwners ? archivedOwners.length : '...'})
        </Typography>
        <hr />
        {match(findHousingOwnersQuery)
          .returnType<ReactNode>()
          .with(
            { data: Pattern.nonNullable, isLoading: false },
            ({ data: housingOwners }) =>
              housingOwners
                .filter((owner) => isInactiveOwnerRank(owner.rank))
                .map((housingOwner) => (
                  <OtherOwnerCard owner={housingOwner} key={housingOwner.id} />
                ))
          )
          .otherwise(() => null)}
      </Stack>
    </Stack>
  );
}

interface OwnerPropertyProps {
  icon: FrIconClassName | RiIconClassName;
  label: string;
  value: ReactNode;
}

function OwnerAttribute(props: OwnerPropertyProps) {
  return (
    <Stack component="section">
      <LabelNext component="h4" sx={{ fontWeight: 700 }}>
        <span
          className={fr.cx(props.icon, 'fr-icon--sm', 'fr-mr-1v')}
          aria-hidden={true}
        />
        {props.label}
      </LabelNext>
      {props.value ?? 'Pas d’information'}
    </Stack>
  );
}

export default OwnerCard;
