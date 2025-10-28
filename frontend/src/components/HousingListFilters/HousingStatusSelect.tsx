import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { HousingStatus } from '@zerologementvacant/models';

import { getHousingState } from '../../models/HousingState';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';

export type HousingStatusSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<HousingStatus, Multiple>,
  | 'className'
  | 'disabled'
  | 'error'
  | 'invalid'
  | 'multiple'
  | 'options'
  | 'value'
  | 'onChange'
>;

function HousingStatusSelect<Multiple extends boolean = false>(
  props: HousingStatusSelectProps<Multiple>
) {
  const renderValue = props.multiple
    ? undefined
    : (status: HousingStatusSelectProps<Multiple>['value']) => (
        <HousingStatusBadge
          status={
            // Single value because `props.multiple` is false
            (status as HousingStatusSelectProps<false>['value']) ?? undefined
          }
        />
      );

  return (
    <AppSelectNext
      {...props}
      getOptionLabel={(status) => (
        <Stack>
          <HousingStatusBadge status={status} />
          <Typography className={fr.cx('fr-hint-text')}>
            {getHousingState(status).hint}
          </Typography>
        </Stack>
      )}
      label="Statut de suivi"
      renderValue={renderValue}
    />
  );
}

export default HousingStatusSelect;
