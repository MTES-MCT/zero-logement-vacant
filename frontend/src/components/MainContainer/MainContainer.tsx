import { Container } from '../_dsfr';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface Props {
  title?: ReactNode | ReactNode[];
  grey?: boolean;
  children: ReactNode | ReactNode[];
}

function MainContainer(props: Props) {
  return (
    <Container fluid spacing="py-4w" className={props.grey ? 'bg-100' : ''}>
      <Container as="section">
        {props.title && (
          <Typography component="h1" variant="h3" mb={3}>
            {props.title}
          </Typography>
        )}
        {props.children}
      </Container>
    </Container>
  );
}

export default MainContainer;
