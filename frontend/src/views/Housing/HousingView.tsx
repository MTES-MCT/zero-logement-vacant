import { useState } from 'react';
import { Col, Row } from '../../components/_dsfr';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import { useHousing } from '../../hooks/useHousing';
import HousingDetailsCard from '../../components/HousingDetails/HousingDetailsCard';
import {
  hasOwnerChanges,
  hasRankChanges,
  HousingOwner
} from '../../models/Owner';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import HousingOwnersModal from '../../components/modals/HousingOwnersModal/HousingOwnersModal';
import { useFindEventsByHousingQuery } from '../../services/event.service';
import {
  useUpdateHousingOwnersMutation,
  useUpdateOwnerMutation
} from '../../services/owner.service';
import { Campaign } from '../../models/Campaign';
import MainContainer from '../../components/MainContainer/MainContainer';
import async from 'async';

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
    campaigns
  } = useHousing();
  const housingCount = count?.housing ?? 0;

  const { refetch: refetchHousingEvents } = useFindEventsByHousingQuery(
    housing?.id ?? '',
    { skip: !housing }
  );
  const [updateOwner] = useUpdateOwnerMutation();
  const [updateHousingOwners] = useUpdateHousingOwnersMutation();

  const [housingOwnersModalKey, setHousingOwnersModalKey] = useState(
    new Date().getTime()
  );

  if (!housing) {
    return <></>;
  }

  const submitHousingOwnersUpdate = async (
    housingOwnersUpdated: HousingOwner[]
  ) => {
    if (!housingOwners || housingOwners.length === 0) {
      return;
    }

    await async.forEach(housingOwnersUpdated, async (housingOwner) => {
      const before = housingOwners.find(
        (before) => before.id === housingOwner.id
      );
      const after = housingOwner;
      if (!before || hasOwnerChanges(before, after)) {
        await updateOwner(housingOwner).unwrap();
      }
    });

    if (
      housingOwners.length !== housingOwnersUpdated.length ||
      hasRankChanges(housingOwners, housingOwnersUpdated)
    ) {
      await updateHousingOwners({
        housingId: housing.id,
        housingOwners: housingOwnersUpdated
      }).unwrap();
      await refetchHousingEvents().unwrap();
    }
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
                      key={housingOwnersModalKey}
                      onCancel={() =>
                        setHousingOwnersModalKey(new Date().getTime())
                      }
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
