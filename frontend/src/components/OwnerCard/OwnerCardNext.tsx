import {
  fr,
  type FrIconClassName,
  type RiIconClassName
} from '@codegouvfr/react-dsfr';
import Avatar from '@codegouvfr/react-dsfr/picto/Avatar';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatAddress } from '@zerologementvacant/models';
import { type ReactNode, useId } from 'react';
import { isBanEligible } from '../../models/Address';
import type { Owner } from '../../models/Owner';
import { age, birthdate } from '../../utils/dateUtils';
import { mailto } from '../../utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';
import LabelNext from '../Label/LabelNext';
import styles from './owner-card.module.scss';

interface OwnerCardProps {
  title: string;
  subtitle?: string;
  owner: Owner | null;
  isLoading: boolean;
  housingCount: number | undefined;
  /**
   * @deprecated
   */
  modify?: ReactNode;
  onAdd?(): void;
}

function OwnerCardNext(props: OwnerCardProps) {
  if (props.isLoading) {
    return (
      <Skeleton
        animation="wave"
        variant="rectangular"
        width="100%"
        height="40rem"
      />
    );
  }

  if (!props.owner) {
    return (
      <Stack sx={{ alignItems: 'center', px: '4rem', textAlign: 'center' }}>
        <Avatar width="7.5rem" height="7.5rem" />
        <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: '1rem' }}>
          Il n’y a pas de propriétaire actuel connu pour ce logement
        </Typography>
        <Button
          priority="secondary"
          iconId="fr-icon-add-line"
          onClick={props.onAdd}
        >
          Ajouter un propriétaire
        </Button>
      </Stack>
    );
  }

  return (
    <Stack component="section">
      <Stack
        component="header"
        direction="row"
        sx={{ justifyContent: 'space-between', mt: '0.5rem' }}
        useFlexGap
      >
        <Typography component="h2" variant="h5">
          {props.title}
        </Typography>
        {props.modify}
      </Stack>

      <Stack component="article" spacing="0.75rem">
        {!props.subtitle ? null : (
          <Stack component="header">
            <Typography
              component="h3"
              variant="body1"
              sx={{ fontSize: '1.125rem', fontWeight: 700, mb: '0.5rem' }}
            >
              {props.subtitle}
            </Typography>
            <hr className="fr-pb-1v" />
          </Stack>
        )}

        <OwnerAttribute
          icon="fr-icon-user-fill"
          label="Nom et prénom"
          value={
            <Typography sx={{ fontWeight: 700 }}>
              {props.owner.fullName}
            </Typography>
          }
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
          label="Adresse postale (source : Base Adresse Nationale)"
          value={
            !props.owner.banAddress
              ? null
              : formatAddress(props.owner.banAddress).join(', ')
          }
        />

        {!isBanEligible(props.owner.banAddress) && (
          <Alert
            small
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
                <AppLink isSimple to={mailto(props.owner.email)}>
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

        <Button
          title="Voir tous ses logements"
          priority="secondary"
          linkProps={{
            to: `/proprietaires/${props.owner.id}`
          }}
          className={styles.housingBouton}
        >
          Voir tous ses logements
          {props.housingCount ? ` (${props.housingCount})` : null}
        </Button>
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
  const label = useId();

  return (
    <Stack component="section">
      <LabelNext component="h4" id={label} sx={{ fontWeight: 700 }}>
        <span
          className={fr.cx(props.icon, 'fr-icon--sm', 'fr-mr-1v')}
          aria-hidden={true}
        />
        {props.label}
      </LabelNext>
      <Typography component="span" aria-labelledby={label}>
        {props.value ?? 'Pas d’information'}
      </Typography>
    </Stack>
  );
}

export default OwnerCardNext;
