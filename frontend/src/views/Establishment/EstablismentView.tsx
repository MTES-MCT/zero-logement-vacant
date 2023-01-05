import React from 'react';

import { Container, Tabs, Text, Title } from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import Tab from '../../components/Tab/Tab';
import EstablishmentGeoPerimeters from './EstablishmentGeoPerimeters';

const EstablishmentView = () => {
  return (
    <Container as="main" fluid>
      <div className="bg-100">
        <Container as="section" className="bg-100" spacing="py-4w">
          <AppBreadcrumb />
          <Title as="h1">Votre territoire</Title>
          <Text size="lead" className="subtitle">
            Vous pourrez renseigner ici les informations relatives à votre
            territoire : périmètres géographiques, guichets contact, taxe en
            vigueur.
            <br />
            Ces informations pourront ensuite être partagées aux propriétaires
            de logements vacants via la génération d’une page web publique
          </Text>
        </Container>
      </div>
      <Container as="section" spacing="py-4w">
        <Tabs>
          <Tab label="Vos périmètres géographiques">
            <EstablishmentGeoPerimeters />
          </Tab>
        </Tabs>
      </Container>
    </Container>
  );
};

export default EstablishmentView;
