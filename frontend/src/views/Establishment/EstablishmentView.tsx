import React from 'react';

import { Container, Row, Tabs, Text, Title } from '@dataesr/react-dsfr';
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
        <Container as="main" spacing="py-4w">
          <Title as="h1">Informations publiques</Title>
          <Text size="lead" className="subtitle">
            Ici vous trouverez des chiffres clés sur votre parc et votre
            activité, pourrez alimenter les aides et gérer vos périmètres
            géographiques.
          </Text>
          <Text size="lead" className="subtitle">
            Vous pourrez également publier une page publique pour partager
            directement avec les propriétaires de logements vacants.
          </Text>
        </Container>
      </Container>
      {establishment && (
        <Container as="article" className="bg-100" spacing="my-8w py-4w">
          <Container as="main">
            <Row spacing="mb-2w">
              <Title as="h2" look="h3">
                Vos informations territoire
              </Title>
              <Text>
                Toutes les informations que vous renseignez ici pourront être
                publié sur votre page publique. Il est donc important de remplir
                des informations fiables et compréhensible.
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
