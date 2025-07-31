import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import {
  HOUSING_STATUS_VALUES,
  HousingStatus
} from '@zerologementvacant/models';
import {
  useController,
  useFormContext,
  type FieldValues
} from 'react-hook-form';

import { Housing } from '../../models/Housing';
import { getSubStatusOptions } from '../../models/HousingState';
import HousingStatusSelect from '../HousingListFilters/HousingStatusSelect';
import HousingSubStatusSelect from '../HousingListFilters/HousingSubStatusSelect';
import PrecisionLists from '../Precision/PrecisionLists';

interface Props {
  housingId: Housing['id'] | null;
}

interface BaseSchema extends FieldValues {
  status: HousingStatus | null;
  subStatus: string | null;
}

function HousingEditionMobilizationTab(props: Props) {
  const form = useFormContext();
  const { field: statusField, fieldState: statusFieldState } = useController<
    BaseSchema,
    'status'
  >({
    name: 'status'
  });
  const { field: subStatusField, fieldState: subStatusFieldState } =
    useController<BaseSchema, 'subStatus'>({
      name: 'subStatus'
    });

  const subStatusDisabled =
    statusField.value === null ||
    getSubStatusOptions(statusField.value).length === 0;

  return (
    <Grid component="section" container sx={{ rowGap: 2 }}>
      <Grid
        component="article"
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        size={12}
      >
        <Typography
          component="h3"
          sx={{ fontSize: '1.125rem', fontWeight: 700 }}
        >
          Statut de suivi
        </Typography>
        <HousingStatusSelect
          error={statusFieldState.error?.message}
          invalid={statusFieldState.invalid}
          options={HOUSING_STATUS_VALUES}
          value={statusField.value}
          onChange={(value) => {
            statusField.onChange(value);
            form.setValue('subStatus', null);
            form.clearErrors('subStatus');
          }}
        />
        <HousingSubStatusSelect
          disabled={subStatusDisabled}
          multiple={false}
          options={
            statusField.value
              ? getSubStatusOptions(statusField.value).map(
                  (option) => option.value
                )
              : []
          }
          error={subStatusFieldState.error?.message}
          invalid={subStatusFieldState.invalid}
          value={subStatusField.value}
          onBlur={subStatusField.onBlur}
          onChange={subStatusField.onChange}
        />
      </Grid>
      {props.housingId ? <PrecisionLists housingId={props.housingId} /> : null}
    </Grid>
  );
}

export default HousingEditionMobilizationTab;
