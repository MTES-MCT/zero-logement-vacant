import { fr } from '@codegouvfr/react-dsfr';
import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { PropsWithChildren } from 'react';

export type HistoryCardProps = PropsWithChildren<{
  icon: FrIconClassName | RiIconClassName;
}>;

function HistoryCard(props: HistoryCardProps) {
  return (
    <Stack
      component="article"
      direction="row"
      spacing="1rem"
      sx={{ alignItems: 'center' }}
    >
      <Box
        sx={{
          display: 'flex',
          background: fr.colors.decisions.background.alt.grey.hover,
          borderRadius: '50%',
          padding: '0.25rem',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.625rem',
          flexShrink: 0,
          aspectRatio: '1/1',
          width: '2.375rem',
          height: '2.375rem'
        }}
      >
        <span className={props.icon} />
      </Box>

      {props.children}
    </Stack>
  );
}

export default HistoryCard;
