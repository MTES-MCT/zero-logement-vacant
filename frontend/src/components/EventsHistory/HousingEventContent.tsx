import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import { HousingStatus } from '@zerologementvacant/models';
import { getHousingDiff } from '../../models/Diff';

import { Event } from '../../models/Event';
import { getSource, Housing } from '../../models/Housing';
import { HousingStates } from '../../models/HousingState';
import OccupancyBadge from '../Housing/OccupancyBadge';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import PatchContent from './PatchContent';

export interface HousingEventContentProps {
  event: Event<Housing>;
}

export function HousingCreatedEventContent(props: HousingEventContentProps) {
  const source = props.event.new ? getSource(props.event.new) : null;
  return `Le logement a été ajouté depuis la source ${source}`;
}

export function HousingOccupancyChangeEventContent(
  props: HousingEventContentProps
) {
  const { event } = props;

  const diff =
    event.old && event.new ? getHousingDiff(event.old, event.new) : null;
  const before = diff?.old ? (
    <OccupancyPatchContent age="before" values={diff.old} />
  ) : null;
  const after = diff?.new ? (
    <OccupancyPatchContent age="after" values={diff.new} />
  ) : null;

  const after = event.new ? <OccupancyPatchContent values={event.new} /> : null;

  return (
    <Stack direction="row" spacing="2rem" sx={{ alignItems: 'center' }}>
      {before}
      <span
        className="fr-icon-arrow-right-s-line"
        style={{ alignSelf: 'center' }}
      />
      {after}
    </Stack>
  );
}

export function HousingStatusChangeEventContent(
  props: HousingEventContentProps
) {
  const { event } = props;

  const before = event.old ? (
    <StatusPatchContent age="before" values={event.old} />
  ) : null;

  const after = event.new ? (
    <StatusPatchContent age="after" values={event.new} />
  ) : null;

  return (
    <Stack direction="row" spacing="2rem" sx={{ alignItems: 'center' }}>
      {before}
      <span
        className="fr-icon-arrow-right-s-line"
        style={{ alignSelf: 'center' }}
      />
      {after}
    </Stack>
  );
}

interface OccupancyPatchContentProps {
  age: 'before' | 'after';
  values: Partial<Housing>;
}

function OccupancyPatchContent(props: OccupancyPatchContentProps) {
  const seniority = props.age === 'before' ? 'Ancienne' : 'Nouvelle';

  return (
    <Stack
      component="section"
      spacing="0.5rem"
      sx={{
        border: `1px solid ${fr.colors.decisions.text.disabled.grey.default}`,
        padding: '1rem'
      }}
    >
      <PatchContent
        filterKey={(key) => ['occupancy', 'occupancyIntended'].includes(key)}
        renderKey={{
          occupancy: `${seniority} occupation`,
          occupancyIntended: `${seniority} occupation prévisionnelle`
        }}
        showKeys
        renderValue={{
          occupancy: (value) =>
            value ? <OccupancyBadge occupancy={value} /> : null,
          occupancyIntended: (value) =>
            value ? <OccupancyBadge occupancy={value} /> : null
        }}
        values={props.values}
      />
    </Stack>
  );
}

interface StatusPatchContentProps {
  age: 'before' | 'after';
  values: Partial<Housing>;
}

function StatusPatchContent(props: StatusPatchContentProps) {
  return (
    <Stack
      component="section"
      spacing="0.5rem"
      sx={{
        border: `1px solid ${fr.colors.decisions.text.disabled.grey.default}`,
        padding: '1rem'
      }}
    >
      <PatchContent
        filterKey={(key) => ['status', 'subStatus'].includes(key)}
        renderKey={{
          status: props.age === 'before' ? 'Ancien statut' : 'Nouveau statut',
          subStatus:
            props.age === 'before'
              ? 'Ancien sous-statut'
              : 'Nouveau sous-statut'
        }}
        showKeys
        renderValue={{
          status: (value: HousingStatus | string | undefined) => {
            const status: HousingStatus | undefined = HousingStates.find(
              (state) => {
                return typeof value === 'string'
                  ? state.title === value
                  : state.status === value;
              }
            )?.status;
            if (status === undefined) {
              throw new Error('Should never happen');
            }
            return <HousingStatusBadge status={status} />;
          }
        }}
        values={props.values}
      />
    </Stack>
  );
}
