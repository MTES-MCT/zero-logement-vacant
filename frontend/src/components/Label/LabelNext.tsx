import { fr } from '@codegouvfr/react-dsfr';
import Typography from '@mui/material/Typography';
import type { TypographyProps } from '@mui/material/Typography';
import type { PropsWithChildren } from 'react';

type LabelProps = TypographyProps;

function LabelNext(props: PropsWithChildren<LabelProps>) {
  return (
    <Typography
      {...props}
      sx={{
        color: fr.colors.decisions.text.mention.grey.default,
        display: 'inline-block',
        fontWeight: 500,
        ...props.sx
      }}
      variant="body2"
    />
  );
}

export default LabelNext;
