import { Col, Container, Row, Title } from '@dataesr/react-dsfr';
import React from 'react';

import AppBreadcrumb from '../AppBreadcrumb/AppBreadcrumb';
import styles from './page-intro.module.scss';

export interface PageIntroProps {
  description?: string;
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
        <AppBreadcrumb />
        <Row>
          <Col>
            <Title as="h1">{props.title}</Title>
          </Col>
        </Row>
      </Container>
    </Container>
  );
}

export default PageIntro;
