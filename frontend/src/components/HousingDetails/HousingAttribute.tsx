import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type ReactNode, useId } from 'react';
import { match, Pattern } from 'ts-pattern';

import LabelNext from '../Label/LabelNext';

interface HousingAttributeProps {
  label: ReactNode;
  value: ReactNode;
  /**
   * @default 'Pas d’information'
   */
  fallback?: string;
}

function HousingAttribute(props: Readonly<HousingAttributeProps>) {
  const labelId = useId();
  const fallback = props.fallback ?? 'Pas d’information';

  return (
    <Stack>
      <LabelNext id={labelId} sx={{ fontWeight: 700 }}>
        {props.label}
      </LabelNext>
      {match(props.value)
        .with(Pattern.union(Pattern.string, Pattern.number), (value) => (
          <Typography aria-labelledby={labelId}>{value}</Typography>
        ))
        .with(Pattern.nullish, () => (
          <Typography aria-labelledby={labelId}>{fallback}</Typography>
        ))
        .otherwise((value) => (
          <span aria-labelledby={labelId}>{value}</span>
        ))}
    </Stack>
  );
}

export default HousingAttribute;
