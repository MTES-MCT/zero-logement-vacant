import { Container, Title } from '../_dsfr';
import React, { ReactNode } from 'react';

export interface Props {
  title?: ReactNode | ReactNode[];
  isGrey?: boolean;
  children: ReactNode | ReactNode[];
}

function MainContainer(props: Props) {
  return (
    <Container
      as="main"
      fluid
      spacing="py-4w"
      className={props.isGrey ? 'bg-100' : ''}
    >
      <Container as="section">
        {props.title && (
          <Title as="h1" look="h3">
            {props.title}
          </Title>
        )}
        {props.children}
      </Container>
    </Container>
  );
}

export default MainContainer;
