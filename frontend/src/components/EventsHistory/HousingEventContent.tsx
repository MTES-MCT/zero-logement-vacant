import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import { HousingStatus } from '@zerologementvacant/models';
import { Housing } from '../../models/Housing';
import { HousingStates } from '../../models/HousingState';
import OccupancyBadge from '../Housing/OccupancyBadge';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import { HousingEventContentProps } from './events/HousingCreatedEventCard';
import PatchContent from './PatchContent';

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
            // Temporary fix for an old value
            if (typeof value === 'string' && value === 'Jamais contacté') {
              return <HousingStatusBadge status={HousingStates[0].status} />;
            }

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
