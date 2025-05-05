import { fr } from '@codegouvfr/react-dsfr';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

import { Event } from '../../models/Event';
import {
  byRank,
  getHousingOwnerRankLabel,
  HousingOwner,
  Owner
} from '../../models/Owner';
import { age, birthdate } from '../../utils/dateUtils';
import PatchContent from './PatchContent';

interface OwnershipEventContentProps {
  event: Event<Owner>;
}

export function OwnerCreatedEventContent(props: OwnershipEventContentProps) {
  const allowedKeys: ReadonlyArray<keyof Owner> = ['fullName', 'rawAddress'];

  return (
    <Box
      sx={{
        border: `1px solid ${fr.colors.decisions.text.disabled.grey.default}`,
        padding: '1rem'
      }}
    >
      <PatchContent
        filterKey={(key) => allowedKeys.includes(key)}
        renderKey={{
          fullName: 'Prénom et nom',
          rawAddress: 'Adresse postale'
        }}
        showKeys
        values={props.event.new as Owner}
      />
    </Box>
  );
}

export function OwnerChangeEventContent(props: OwnershipEventContentProps) {
  const { event } = props;
  const allowedKeys: ReadonlyArray<keyof Owner> =
    event.name === 'Modification de coordonnées'
      ? ['rawAddress', 'banAddress', 'email', 'phone', 'additionalAddress']
      : ['fullName', 'birthDate'];
  return (
    <Stack direction="row" spacing="2rem" sx={{ alignItems: 'center' }}>
      <Stack
        spacing="0.5rem"
        sx={{
          border: `1px solid ${fr.colors.decisions.text.disabled.grey.default}`,
          padding: '1rem'
        }}
      >
        <PatchContent
          values={event.old as Owner}
          filterKey={(key) => allowedKeys.includes(key)}
          renderKey={{
            rawAddress: 'Ancienne adresse',
            email: 'Ancien email',
            phone: 'Ancien téléphone',
            additionalAddress: 'Ancienne adresse complémentaire',
            fullName: 'Anciens prénom et nom',
            birthDate: 'Ancienne date de naissance'
          }}
          showKeys
        />
      </Stack>
      <span className="fr-icon-arrow-right-s-line" />
      <Stack
        spacing="0.5rem"
        sx={{
          border: `1px solid ${fr.colors.decisions.text.disabled.grey.default}`,
          padding: '1rem'
        }}
      >
        <PatchContent
          values={event.new as Owner}
          filterKey={(key) => allowedKeys.includes(key)}
          renderKey={{
            rawAddress: 'Nouvelle adresse',
            email: 'Nouvel email',
            phone: 'Nouveau téléphone',
            additionalAddress: 'Nouvelle adresse complémentaire',
            fullName: 'Nouveaux prénom et nom',
            birthDate: 'Nouvelle date de naissance'
          }}
          showKeys
        />
      </Stack>
    </Stack>
  );
}

export function PrimaryOwnerChangeEventContent(
  props: OwnershipEventContentProps
) {
  const housingOwnerBefore: HousingOwner | null = props.event.old
    ? {
        ...props.event.old,
        rank: 1,
        idprocpte: null,
        idprodroit: null,
        locprop: null
      }
    : null;
  const housingOwnerAfter: HousingOwner | null = props.event.new
    ? {
        ...props.event.new,
        rank: 1,
        idprocpte: null,
        idprodroit: null,
        locprop: null
      }
    : null;

  return (
    <OwnersChangeEventContent
      conflict={props.event.conflict ?? false}
      housingOwnersBefore={housingOwnerBefore ? [housingOwnerBefore] : []}
      housingOwnersAfter={housingOwnerAfter ? [housingOwnerAfter] : []}
    />
  );
}

interface HousingOwnersChangeEventContentProps {
  housingOwnersBefore: HousingOwner[];
  housingOwnersAfter: HousingOwner[];
  conflict: boolean;
}

export function OwnersChangeEventContent(
  props: HousingOwnersChangeEventContentProps
) {
  const allowedKeys: ReadonlyArray<keyof HousingOwner> = [
    'fullName',
    'birthDate',
    'rawAddress'
  ];

  function getTitle(housingOwner: HousingOwner): ReactNode {
    const label = getHousingOwnerRankLabel(housingOwner.rank);
    return `${label[0].toLowerCase()}${label.substring(1)}`;
  }

  return (
    <Stack direction="row" spacing="2rem" sx={{ alignItems: 'center' }}>
      <Stack spacing="1rem">
        {props.housingOwnersBefore.toSorted(byRank).map((housingOwner) => (
          <Stack
            key={housingOwner.id}
            sx={{
              border: `1px solid ${fr.colors.decisions.text.disabled.grey.default}`,
              padding: '1rem'
            }}
          >
            <Typography
              sx={{
                color: fr.colors.decisions.text.title.grey.default,
                fontWeight: 500,
                mb: '0.5rem'
              }}
            >
              {`Ancien ${getTitle(housingOwner)}`}
            </Typography>
            <PatchContent
              key={housingOwner.id}
              values={housingOwner}
              filterKey={(key) => allowedKeys.includes(key)}
              renderValue={{
                birthDate: (value) =>
                  !value
                    ? null
                    : `né(e) le ${birthdate(value)} (${age(value)} ans)`,
                rawAddress: (value) =>
                  value?.map((part) => (
                    <Typography key={part}>{part}</Typography>
                  ))
              }}
            />
          </Stack>
        ))}
      </Stack>

      {props.conflict ? (
        <span className="fr-icon-error-warning-fill color-red-marianne-625" />
      ) : (
        <span className="fr-icon-arrow-right-s-line" />
      )}

      <Stack spacing="1rem">
        {props.housingOwnersAfter.toSorted(byRank).map((housingOwner) => (
          <Stack
            key={housingOwner.id}
            sx={{
              border: `1px solid ${fr.colors.decisions.text.disabled.grey.default}`,
              padding: '1rem'
            }}
          >
            <Typography
              sx={{
                color: fr.colors.decisions.text.title.grey.default,
                fontWeight: 500,
                mb: '0.5rem'
              }}
            >
              {`Nouveau ${getTitle(housingOwner)}`}
            </Typography>
            <PatchContent
              key={housingOwner.id}
              values={housingOwner}
              filterKey={(key) => allowedKeys.includes(key)}
              renderValue={{
                birthDate: (value) =>
                  !value
                    ? null
                    : `né(e) le ${birthdate(value)} (${age(value)} ans)`,
                rawAddress: (value) =>
                  value?.map((part) => (
                    <Typography key={part}>{part}</Typography>
                  ))
              }}
            />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
