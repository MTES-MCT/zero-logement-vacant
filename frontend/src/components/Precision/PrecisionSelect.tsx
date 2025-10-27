import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { Precision, PrecisionCategory } from '@zerologementvacant/models';
import type { ReactNode } from 'react';
import { PRECISION_CATEGORY_LABELS } from '../../models/Precision';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';

interface PrecisionFilterProps {
  label: ReactNode;
  options: Array<Precision>;
  values: Array<Precision>;
  onChange(values: Array<Precision>): void;
}

function PrecisionSelect(props: PrecisionFilterProps) {
  return (
    <AppSelectNext
      label={props.label}
      multiple
      options={props.options}
      getOptionKey={(precision) => precision.id}
      getOptionLabel={(precision) => precision.label}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      groupBy={(precision) => precision.category}
      renderGroup={(group) => {
        const { icon, label } =
          PRECISION_CATEGORY_LABELS[group as PrecisionCategory];
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              className={fr.cx(icon, 'fr-icon--sm')}
              component="span"
              sx={{
                color: fr.colors.decisions.text.label.blueFrance.default
              }}
            />
            <Typography sx={{ fontWeight: 700 }} variant="body2">
              {label}
            </Typography>
          </Stack>
        );
      }}
      value={props.values}
      onChange={props.onChange}
    />
  );
}

export default PrecisionSelect;
