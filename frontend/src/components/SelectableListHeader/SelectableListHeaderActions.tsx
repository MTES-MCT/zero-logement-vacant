import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';

interface SelectableListHeaderActionsProps {
  children?: ReactNode | ReactNode[];
}

function SelectableListHeaderActions(props: SelectableListHeaderActionsProps) {
  return (
    <Stack direction="row" alignItems="center" sx={{ gap: '0.5rem' }}>
      {props.children}
    </Stack>
  );
}

export default SelectableListHeaderActions;
