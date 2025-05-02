import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import { HousingStatus } from '@zerologementvacant/models';

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

  const before = event.old ? (
    <OccupancyPatchContent values={event.old} />
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

function OccupancyPatchContent(props: { values: Partial<Housing> }) {
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
        mapKey={{
          occupancy: 'Ancienne occupation',
          occupancyIntended: 'Ancienne occupation prévisionnelle'
        }}
        showKeys
        mapValue={{
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
        mapKey={{
          status: props.age === 'before' ? 'Ancien statut' : 'Nouveau statut',
          subStatus:
            props.age === 'before'
              ? 'Ancien sous-statut'
              : 'Nouveau sous-statut'
        }}
        showKeys
        mapValue={{
          status: (value) => {
            const status: HousingStatus | undefined = HousingStates.find(
              (state) => state.title === (value as unknown as string)
            )?.status;
            if (!status) {
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
