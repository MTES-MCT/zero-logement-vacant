import React, { useState } from 'react';
import { Col, Container, Row } from '@dataesr/react-dsfr';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import { useHousing } from '../../hooks/useHousing';
import HousingDetailsCard from '../../components/HousingDetails/HousingDetailsCard';
import { HousingOwner } from '../../models/Owner';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import HousingOwnersModal from '../../components/modals/HousingOwnersModal/HousingOwnersModal';
import { useFindEventsByHousingQuery } from '../../services/event.service';
import { useUpdateHousingOwnersMutation } from '../../services/owner.service';
import { Campaign } from '../../models/Campaign';

const HousingView = () => {
  useDocumentTitle('Fiche logement');
  const {
    housing,
    coOwners,
    mainHousingOwner,
    housingOwners,
    events,
    notes,
    campaigns,
  } = useHousing();
  const [isModalHousingOwnersOpen, setIsModalHousingOwnersOpen] =
    useState(false);

  const { refetch: refetchHousingEvents } = useFindEventsByHousingQuery(
    housing?.id ?? '',
    { skip: !housing }
  );
  const [updateHousingOwners] = useUpdateHousingOwnersMutation();

  if (!housing) {
    return <></>;
  }

  const submitHousingOwnersUpdate = async (
    housingOwnersUpdated: HousingOwner[]
  ) => {
    await updateHousingOwners({
      housingId: housing.id,
      housingOwners: housingOwnersUpdated,
    });
    await refetchHousingEvents();
    setIsModalHousingOwnersOpen(false);
  };

  return (
    <>
      <Container as="main" className="bg-100" fluid>
        <Container as="section">
          <Row alignItems="top" gutters spacing="mt-3w mb-0">
            <Col n="4">
              {mainHousingOwner && housingOwners && (
                <>
                  <OwnerCard
                    owner={mainHousingOwner}
                    coOwners={coOwners}
                    onModify={() => setIsModalHousingOwnersOpen(true)}
                  ></OwnerCard>
                  {isModalHousingOwnersOpen && (
                    <HousingOwnersModal
                      housingId={housing.id}
                      housingOwners={housingOwners}
                      onSubmit={submitHousingOwnersUpdate}
                      onClose={() => setIsModalHousingOwnersOpen(false)}
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
                    housingEvents={events ?? []}
                    housingNotes={notes ?? []}
                    housingCampaigns={(campaigns as Campaign[]) ?? []}
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
