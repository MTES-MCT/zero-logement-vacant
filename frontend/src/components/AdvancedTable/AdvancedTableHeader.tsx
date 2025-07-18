import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

interface AdvancedTableHeaderProps {
  title: string;
  sort?: ReactNode;
}

function AdvancedTableHeader(props: AdvancedTableHeaderProps) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      spacing={1}
    >
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {props.title}
      </Typography>
      {props.sort}
    </Stack>
  );
}

export default AdvancedTableHeader;
