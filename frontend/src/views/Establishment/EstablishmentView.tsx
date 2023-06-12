import React from 'react';

import { Col, Container, Row, Tabs, Text, Title } from '@dataesr/react-dsfr';
import Tab from '../../components/Tab/Tab';
import EstablishmentContactPoints from './EstablishmentContactPoints';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import EstablishmentLocalityTaxes from './EstablishmentLocalityTaxes';
import { useAppSelector } from '../../hooks/useStore';
import ContactPointPublicPage from '../../components/ContactPoint/ContactPointPublicPage';

const EstablishmentView = () => {
  useDocumentTitle('Informations publiques');
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );
  return (
    <Container as="main" fluid>
      <Container as="article" className="bg-100" fluid>
        <Container as="header" spacing="py-4w">
          <Row>
            <Col n="10">
              <Title as="h1">Informations publiques</Title>
              <Text size="lead" className="subtitle">
                Renseignez les informations de votre territoire pour alimenter
                votre page publique ! Cela permettra d’orienter les
                propriétaires vers vos guichets de contact locaux et de
                communiquer sur l’existence de taxes sur la vacance.
              </Text>
            </Col>
          </Row>
        </Container>
      </Container>
      {establishment && (
        <Container as="article" className="bg-100" spacing="my-8w py-4w">
          <Container as="main">
            <Row spacing="mb-2w">
              <Title as="h2" look="h3">
                Référencement de vos informations locales
              </Title>
              <Text>
                Les informations que vous renseignez ici pourront être publié
                sur votre page publique. Il est donc important de remplir des
                informations fiables et compréhensible.
              </Text>
              <Tabs>
                <Tab label="Vos guichets contact" className="bg-white">
                  <EstablishmentContactPoints
                    establishmentId={establishment.id}
                  />
                </Tab>
                <Tab
                  label="Taxes sur les logements vacants"
                  className="bg-white"
                >
                  <EstablishmentLocalityTaxes
                    establishmentId={establishment.id}
                  />
                </Tab>
              </Tabs>
            </Row>
            <Row>
              <Title as="h3">Votre page publique</Title>
              <ContactPointPublicPage establishment={establishment} />
            </Row>
          </Container>
        </Container>
      )}
    </Container>
  );
};

export default EstablishmentView;
