import React from 'react';
import { Col, Container, Link, Row } from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import OwnerDetailsCard from '../../components/OwnerDetailsCard/OwnerDetailsCard';
import { useHousing } from '../../hooks/useHousing';
import HousingDetailsCard from '../../components/HousingDetailsCard/HousingDetailsCard';

const HousingView = () => {
  const { housing, mainHousingOwner, housingOwners } = useHousing();

  return (
    <>
      <Container as="main" className="bg-100" fluid>
        <Container as="section">
          <Row>
            <AppBreadcrumb />
          </Row>
          <Row alignItems="top" gutters spacing="mt-3w mb-0">
            <Col n="4">
              {mainHousingOwner && (
                <>
                  <OwnerCard owner={mainHousingOwner}>
                    <Link
                      title="Voir tous ses logements"
                      href={
                        (window.location.pathname.indexOf('proprietaires') ===
                        -1
                          ? window.location.pathname
                          : '') +
                        '/proprietaires/' +
                        mainHousingOwner.id
                      }
                      className="fr-btn--md fr-btn fr-mt-1w fr-px-6w"
                    >
                      Voir tous ses logements ({mainHousingOwner.housingCount})
                    </Link>
                  </OwnerCard>
                  <OwnerDetailsCard
                    owner={mainHousingOwner}
                    onModify={() => {}}
                  />
                </>
              )}
            </Col>
            <Col n="8">
              {housing && (
                <>
                  <HousingDetailsCard
                    housing={housing}
                    housingOwners={housingOwners ?? []}
                  />
                </>
              )}
            </Col>
          </Row>
        </Container>
      </Container>
    </>
  );
};

export default HousingView;
