import React, { useState } from 'react';
import { Col, Container, Link, Row } from '@dataesr/react-dsfr';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import OwnerDetailsCard from '../../components/OwnerDetailsCard/OwnerDetailsCard';
import { useHousing } from '../../hooks/useHousing';
import HousingDetailsCard from '../../components/HousingDetails/HousingDetailsCard';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';
import { Owner } from '../../models/Owner';
import { updateMainHousingOwner } from '../../store/actions/housingAction';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch } from '../../hooks/useStore';

const HousingView = () => {
  useDocumentTitle('Fiche logement');
  const dispatch = useAppDispatch();
  const { housing, mainHousingOwner, housingOwners, events, notes } =
    useHousing();
  const [isModalOwnerOpen, setIsModalOwnerOpen] = useState(false);

  const updateMainOwner = (owner: Owner) => {
    if (housing) {
      dispatch(updateMainHousingOwner(owner, housing?.id));
      setIsModalOwnerOpen(false);
    }
  };

  return (
    <>
      <Container as="main" className="bg-100" fluid>
        <Container as="section">
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
                    onModify={() => setIsModalOwnerOpen(true)}
                  />
                  {isModalOwnerOpen && (
                    <OwnerEditionModal
                      owner={mainHousingOwner}
                      onUpdate={updateMainOwner}
                      onClose={() => setIsModalOwnerOpen(false)}
                    />
                  )}
                </>
              )}
            </Col>
            <Col n="8">
              {housing && (
                <>
                  <HousingDetailsCard
                    housing={housing}
                    housingOwners={housingOwners ?? []}
                    housingEvents={events ?? []}
                    housingNotes={notes ?? []}
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
