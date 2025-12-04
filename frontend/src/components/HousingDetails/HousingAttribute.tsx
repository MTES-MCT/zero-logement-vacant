import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type ReactNode, useId } from 'react';
import { match, Pattern } from 'ts-pattern';

import LabelNext from '../Label/LabelNext';

interface HousingAttributeProps {
  label: string;
  value: ReactNode;
  /**
   * @default 'Pas d'information'
   */
  fallback?: string;
}

function HousingAttribute(props: Readonly<HousingAttributeProps>) {
  const label = useId();
  const fallback = props.fallback ?? 'Pas d’information';

  return (
    <Stack>
      <LabelNext id={label} sx={{ fontWeight: 700 }}>
        {props.label}
      </LabelNext>
      {match(props.value)
        .with(Pattern.union(Pattern.string, Pattern.number), (value) => (
          <Typography aria-labelledby={label}>{value}</Typography>
        ))
        .with(Pattern.nullish, () => (
          <Typography aria-labelledby={label}>{fallback}</Typography>
        ))
        .otherwise((value) => (
          <span aria-labelledby={label}>{value}</span>
        ))}
    </Stack>
  );
}

export default HousingAttribute;
