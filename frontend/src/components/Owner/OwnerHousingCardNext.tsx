import { Card } from '@codegouvfr/react-dsfr/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  HousingKind,
  isPrimaryOwner,
  type HousingStatus,
  type Occupancy,
  type OwnerRank,
  type PropertyRight
} from '@zerologementvacant/models';

import Label from '~/components/Label/LabelNext';
import PropertyRightTag from '~/components/Owner/PropertyRightTag';
import OccupancyBadge from '../Housing/OccupancyBadge';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import type { ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';
import Button from '@codegouvfr/react-dsfr/Button';

import RankBadge from '~/components/Owner/RankBadge';

export interface OwnerHousingCardProps {
  /**
   * The housing id
   */
  id: string;
  propertyRight: PropertyRight | null;
  rank: OwnerRank | null;
  address: string;
  additionalAddress: string | null;
  localId: string;
  kind: HousingKind;
  surface: number | null;
  occupancy: Occupancy;
  status: HousingStatus;
}

function OwnerHousingCard(props: OwnerHousingCardProps) {
  const PropertyRight = () =>
    !props.propertyRight ? null : (
      <PropertyRightTag value={props.propertyRight} />
    );

  const Rank = () =>
    props.rank && isPrimaryOwner({ rank: props.rank }) ? (
      <RankBadge value={props.rank} />
    ) : null;

  const kind = match(props.kind)
    .returnType<string>()
    .with(HousingKind.APARTMENT, () => 'Appartement')
    .with(HousingKind.HOUSE, () => 'Maison')
    .exhaustive();

  return (
    <Card
      start={
        <Stack direction="row" spacing="0.5rem" useFlexGap>
          <PropertyRight />
          <Rank />
        </Stack>
      }
      title={
        <Typography variant="subtitle2" sx={{ fontWeight: 500, mt: '0.75rem' }}>
          {props.address}
        </Typography>
      }
      desc={
        <Stack spacing="1rem" useFlexGap>
          <Stack spacing="0.25rem" useFlexGap>
            <Attribute
              label="Complément d’adresse"
              value={props.additionalAddress}
            />

            <Attribute
              label="Identifiant fiscal national"
              value={props.localId}
            />

            <Attribute label="Type de logement" value={kind} />

            <Attribute
              label="Surface"
              value={props.surface ? `${props.surface} m²` : null}
            />

            <Attribute
              label="Occupation"
              value={
                <OccupancyBadge
                  occupancy={props.occupancy}
                  tagProps={{ small: true }}
                />
              }
            />

            <Attribute
              label="Statut"
              value={<HousingStatusBadge status={props.status} />}
            />
          </Stack>
        </Stack>
      }
      end={
        <Stack
          direction="row"
          sx={{ justifyContent: 'flex-end', mt: '-0.5rem' }}
        >
          <Button
            priority="secondary"
            linkProps={{ to: `/logements/${props.id}` }}
          >
            Voir la fiche
          </Button>
        </Stack>
      }
    />
  );
}

interface AttributeProps {
  label: string;
  value: ReactNode;
}

function Attribute(props: AttributeProps) {
  return (
    <Stack>
      <Label>{props.label}</Label>
      {match(props.value)
        .with(Pattern.string, (value) => <Typography>{value}</Typography>)
        .with(Pattern.nullish, () => <Typography>Non renseigné</Typography>)
        .otherwise((value) => value)}
    </Stack>
  );
}

export default OwnerHousingCard;
