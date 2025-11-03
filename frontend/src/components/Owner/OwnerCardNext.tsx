import {
  fr,
  type FrIconClassName,
  type RiIconClassName
} from '@codegouvfr/react-dsfr';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatAddress, type PropertyRight } from '@zerologementvacant/models';

import { useId, type ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';
import AppLink from '~/components/_app/AppLink/AppLink';
import HousingOwnersEmpty from '~/components/HousingOwnersEmpty/HousingOwnersEmpty';
import LabelNext from '~/components/Label/LabelNext';
import OwnerKindTag from '~/components/Owner/OwnerKindTag';
import styles from '~/components/OwnerCard/owner-card.module.scss';
import { isBanEligible, type Address } from '~/models/Address';
import { age, birthdate } from '~/utils/dateUtils';
import { mailto } from '~/utils/stringUtils';
import PropertyRightTag from './PropertyRightTag';

interface OwnerCardProps {
  title?: string;
  id: string | null;
  name?: string | null;
  birthdate: string | null;
  kind?: string | null;
  propertyRight?: PropertyRight | null;
  siren?: string | null;
  dgfipAddress: string[] | null;
  banAddress: Address | null;
  additionalAddress: string | null;
  email: string | null;
  phone: string | null;
  isLoading: boolean;
  housingCount?: number | null;
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

  if (!props.id) {
    return (
      <HousingOwnersEmpty
        title="Il n'y a pas de propriétaire actuel connu pour ce logement"
        buttonProps={{
          onClick: props.onAdd
        }}
      />
    );
  }

  return (
    <Stack component="section" spacing="0.5rem" useFlexGap>
      <Stack component="article" spacing="0.75rem">
        {!props.title ? null : (
          <Stack component="header">
            <Typography
              component="h3"
              variant="body1"
              sx={{ fontSize: '1.125rem', fontWeight: 700, mb: '0.5rem' }}
            >
              {props.title}
            </Typography>
            <hr style={{ paddingBottom: '0.5rem' }} />
          </Stack>
        )}

        {match(props.name)
          .with(undefined, () => null)
          .otherwise((value) => (
            <OwnerAttribute
              icon="fr-icon-user-fill"
              label="Nom et prénom"
              value={<Typography sx={{ fontWeight: 700 }}>{value}</Typography>}
            />
          ))}

        <OwnerAttribute
          icon="fr-icon-calendar-2-line"
          label={`Date de ${props.kind === 'Particulier' ? 'naissance' : 'création'}`}
          value={
            !props.birthdate ? null : (
              <Typography>
                {birthdate(props.birthdate)} ({age(props.birthdate)}&nbsp;ans)
              </Typography>
            )
          }
        />

        {match(props.kind)
          .with(undefined, () => null)
          .otherwise((value) => (
            <OwnerAttribute
              icon="ri-id-card-line"
              label="Type de propriétaire"
              value={<OwnerKindTag value={value} tagProps={{ small: false }} />}
            />
          ))}

        {match(props.propertyRight)
          .with(Pattern.not(undefined), (value) => (
            <OwnerAttribute
              icon="ri-auction-line"
              label="Nature du droit sur le bien"
              value={
                value ? (
                  <PropertyRightTag value={value} tagProps={{ small: false }} />
                ) : null
              }
            />
          ))
          .otherwise(() => null)}

        {match({ kind: props.kind, siren: props.siren })
          .with(
            { kind: Pattern.union(null, undefined, 'Particulier') },
            () => null
          )
          .with({ kind: Pattern.not('Particulier') }, ({ siren }) => (
            <OwnerAttribute
              icon="fr-icon-passport-line"
              label="SIREN"
              value={siren}
            />
          ))
          .exhaustive()}

        <OwnerAttribute
          icon="fr-icon-bank-line"
          label="Adresse fiscale (source : DGFIP)"
          value={
            !props.dgfipAddress ? null : (
              <Typography>{props.dgfipAddress.join(', ')}</Typography>
            )
          }
        />

        <OwnerAttribute
          icon="fr-icon-home-4-line"
          label="Adresse postale (source : Base Adresse Nationale)"
          value={
            !props.banAddress
              ? null
              : formatAddress(props.banAddress).join(', ')
          }
        />

        {!isBanEligible(props.banAddress) && (
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
            !props.additionalAddress ? null : (
              <Typography>{props.additionalAddress}</Typography>
            )
          }
        />

        <OwnerAttribute
          icon="fr-icon-mail-line"
          label="Adresse e-mail"
          value={
            !props.email ? null : (
              <Typography>
                <AppLink isSimple to={mailto(props.email)}>
                  {props.email}
                </AppLink>
              </Typography>
            )
          }
        />

        <OwnerAttribute
          icon="fr-icon-phone-line"
          label="Téléphone"
          value={!props.phone ? null : <Typography>{props.phone}</Typography>}
        />

        {match(props.housingCount)
          .with(Pattern.number, (count) => (
            <Button
              title="Voir tous ses logements"
              priority="secondary"
              linkProps={{
                to: `/proprietaires/${props.id}`
              }}
              className={styles.housingBouton}
            >
              Voir tous ses logements ({count})
            </Button>
          ))
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
