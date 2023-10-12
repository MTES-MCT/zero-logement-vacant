import React from 'react';
import { Col, Row } from '../../components/_dsfr';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import { useHousing } from '../../hooks/useHousing';
import HousingDetailsCard from '../../components/HousingDetails/HousingDetailsCard';
import { HousingOwner } from '../../models/Owner';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import HousingOwnersModal from '../../components/modals/HousingOwnersModal/HousingOwnersModal';
import { useFindEventsByHousingQuery } from '../../services/event.service';
import { useUpdateHousingOwnersMutation } from '../../services/owner.service';
import { Campaign } from '../../models/Campaign';
import MainContainer from '../../components/MainContainer/MainContainer';

const HousingView = () => {
  useDocumentTitle('Fiche logement');
  const {
    housing,
    count,
    coOwners,
    mainHousingOwner,
    housingOwners,
    events,
    notes,
    campaigns,
  } = useHousing();
  const housingCount = count?.housing ?? 0;

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
  };

  return (
    <>
      <MainContainer grey>
        <Row alignItems="top" gutters>
          <Col n="4">
            {mainHousingOwner && housingOwners && (
              <>
                <OwnerCard
                  owner={mainHousingOwner}
                  coOwners={coOwners}
                  housingCount={housingCount}
                  modify={
                    <HousingOwnersModal
                      housingId={housing.id}
                      housingOwners={housingOwners}
                      onSubmit={submitHousingOwnersUpdate}
                    />
                  }
                ></OwnerCard>
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
      </MainContainer>
    </>
  );
};

export default HousingView;
