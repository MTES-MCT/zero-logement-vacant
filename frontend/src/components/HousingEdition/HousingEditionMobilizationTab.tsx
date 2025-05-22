import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';

import {
  HOUSING_STATUS_VALUES,
  HousingStatus
} from '@zerologementvacant/models';
import { useController, useFormContext } from 'react-hook-form';
import { Housing } from '../../models/Housing';
import { getSubStatusOptions } from '../../models/HousingState';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import HousingStatusMultiSelect from '../HousingListFilters/HousingStatusMultiSelect';
import PrecisionLists from '../Precision/PrecisionLists';
import { HousingEditionFormSchema } from './HousingEditionSideMenu';

interface Props {
  housingId: Housing['id'] | null;
}

function HousingEditionMobilizationTab(props: Props) {
  const form = useFormContext();
  const { field: statusField, fieldState: statusFieldState } = useController<
    HousingEditionFormSchema,
    'status'
  >({
    name: 'status'
  });
  const { field: subStatusField, fieldState: subStatusFieldState } =
    useController<HousingEditionFormSchema, 'subStatus'>({
      name: 'subStatus'
    });

  const subStatusDisabled =
    getSubStatusOptions(statusField.value as HousingStatus) === undefined;

  return (
    <Grid component="section" container sx={{ rowGap: 2 }}>
      <Grid
        component="article"
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        xs={12}
      >
        <Typography
          component="h3"
          sx={{ fontSize: '1.125rem', fontWeight: 700 }}
        >
          Statut de suivi
        </Typography>
        <HousingStatusMultiSelect
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
        <AppSelectNext
          disabled={subStatusDisabled || [HousingStatus.NEVER_CONTACTED, HousingStatus.WAITING].includes(statusField.value)}
          label="Sous-statut de suivi"
          multiple={false}
          options={
            getSubStatusOptions(statusField.value as HousingStatus)?.map(
              (option) => option.value
            ) ?? []
          }
          error={subStatusFieldState.error?.message}
          invalid={subStatusFieldState.invalid}
          value={subStatusField.value}
          onBlur={subStatusField.onBlur}
          onChange={subStatusField.onChange}
        />
      </Grid>

      <PrecisionLists housingId={props.housingId} />
    </Grid>
  );
}

export default HousingEditionMobilizationTab;
