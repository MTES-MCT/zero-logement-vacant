import { Col, Container, Row, Text, Title } from '@dataesr/react-dsfr';
import React, { ReactNode } from 'react';

import styles from './page-intro.module.scss';

export interface PageIntroProps {
  description?: ReactNode | ReactNode[];
  /**
   * @deprecated
   * Shall be replaced by automatic retrieval from the breadcrumb.
   */
  title?: string;
}

function PageIntro(props: PageIntroProps) {
  return (
    <Container as="section" className={styles.container} fluid spacing="py-4w">
      <Container as="article">
        <Row>
          <Col n="8">
            <Title as="h1" spacing="mb-1w">
              {props.title}
            </Title>
            <Text size="lead" className="subtitle">
              {props.description}
            </Text>
          </Col>
        </Row>
        <Row></Row>
      </Container>
    </Container>
  );
}

export default PageIntro;
