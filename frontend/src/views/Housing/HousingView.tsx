import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import { skipToken } from '@reduxjs/toolkit/query';
import async from 'async';
import { useState } from 'react';

import HousingHeader from '../../components/Housing/HousingHeader';
import HousingDetailsCard from '../../components/HousingDetails/HousingDetailsCard';
import { HousingEditionProvider } from '../../components/HousingEdition/useHousingEdition';
import HousingOwnersModal from '../../components/modals/HousingOwnersModal/HousingOwnersModal';
import InactiveOwnerList from '../../components/Owner/InactiveOwnerList';
import SecondaryOwnerList from '../../components/Owner/SecondaryOwnerList';
import { useHousingOwners } from '../../components/Owner/useHousingOwners';
import OwnerCardNext from '../../components/OwnerCard/OwnerCardNext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useHousing } from '../../hooks/useHousing';
import {
  hasOwnerChanges,
  hasRankChanges,
  HousingOwner
} from '../../models/Owner';
import { useCountHousingQuery } from '../../services/housing.service';
import {
  useUpdateHousingOwnersMutation,
  useUpdateOwnerMutation
} from '../../services/owner.service';
import NotFoundView from '../NotFoundView';

function HousingView() {
  const { housing, housingId, getHousingQuery } = useHousing();
  useDocumentTitle(
    housing
      ? `Fiche logement - ${housing.rawAddress.join(' ')}`
      : 'Page non trouvée'
  );
  const { owner, housingOwners } = useHousingOwners(housingId);
  const { data: count } = useCountHousingQuery(
    housing?.owner?.id ? { ownerIds: [housing.owner.id] } : skipToken
  );

  const [updateOwner] = useUpdateOwnerMutation();
  const [updateHousingOwners] = useUpdateHousingOwnersMutation();

  const [housingOwnersModalKey, setHousingOwnersModalKey] = useState(
    new Date().getTime()
  );

  async function submitHousingOwnersUpdate(
    housingOwnersUpdated: HousingOwner[]
  ) {
    if (!housing || !housingOwners || housingOwners.length === 0) {
      return;
    }

    await async.forEach(housingOwnersUpdated, async (housingOwner) => {
      const before = housingOwners.find(
        (before) => before.id === housingOwner.id
      );
      const after = housingOwner;
      if (!before || hasOwnerChanges(before, after)) {
        // @ts-expect-error: housingOwner has a wrong type
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
    }
  }

  if (getHousingQuery.isError && !housing) {
    return <NotFoundView />;
  }

  return (
    <HousingEditionProvider>
      <Container maxWidth={false} sx={{ my: '2rem' }}>
        <HousingHeader
          className="fr-mb-3w"
          housing={housing}
          isLoading={getHousingQuery.isLoading}
        />

        <Grid container columnSpacing={3}>
          {/* Set a custom order to facilitate accessibility:
        housing first, owner second */}
          <Grid order={2} size={8}>
            <HousingDetailsCard housing={housing} />
          </Grid>
          <Grid
            order={1}
            rowGap="1.5rem"
            sx={{ display: 'flex', flexFlow: 'column nowrap' }}
            size={4}
          >
            <OwnerCardNext
              owner={owner}
              housingCount={count?.housing}
              modify={
                housingOwners ? (
                  <HousingOwnersModal
                    housingId={housingId}
                    housingOwners={housingOwners}
                    onSubmit={submitHousingOwnersUpdate}
                    key={housingOwnersModalKey}
                    onCancel={() =>
                      setHousingOwnersModalKey(new Date().getTime())
                    }
                  />
                ) : null
              }
            />
            <SecondaryOwnerList housingId={housingId} />
            <InactiveOwnerList housingId={housingId} />
          </Grid>
        </Grid>
      </Container>
    </HousingEditionProvider>
  );
}

export default HousingView;
