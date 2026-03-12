import { Container } from '../_dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface Props {
  title?: ReactNode | ReactNode[];
  titleAction?: ReactNode;
  grey?: boolean;
  children: ReactNode | ReactNode[];
}

function MainContainer(props: Props) {
  return (
    <Container fluid spacing="py-4w" className={props.grey ? 'bg-100' : ''}>
      <Container as="section">
        {props.title && (
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', mb: '1.5rem' }}
          >
            <Typography component="h1" variant="h3">
              {props.title}
            </Typography>
            {props.titleAction}
          </Stack>
        )}
        {props.children}
      </Container>
    </Container>
  );
}

export default MainContainer;
