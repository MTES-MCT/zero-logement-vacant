import Container from '@mui/material/Container';
import Grid from '@mui/material/Unstable_Grid2';
import async from 'async';
import { useState } from 'react';

import HousingHeader from '../../components/Housing/HousingHeader';
import HousingDetailsCard from '../../components/HousingDetails/HousingDetailsCard';
import HousingOwnersModal from '../../components/modals/HousingOwnersModal/HousingOwnersModal';
import InactiveOwnerList from '../../components/Owner/InactiveOwnerList';
import SecondaryOwnerList from '../../components/Owner/SecondaryOwnerList';
import { useHousingOwners } from '../../components/Owner/useHousingOwners';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useHousing } from '../../hooks/useHousing';
import {
  hasOwnerChanges,
  hasRankChanges,
  HousingOwner
} from '../../models/Owner';
import {
  useUpdateHousingOwnersMutation,
  useUpdateOwnerMutation
} from '../../services/owner.service';
import NotFoundView from '../NotFoundView';

function HousingView() {
  const { housing, housingId, count, getHousingQuery } = useHousing();
  const housingCount = count?.housing ?? 0;
  useDocumentTitle(
    housing
      ? `Fiche logement - ${housing.rawAddress.join(' ')}`
      : 'Page non trouvée'
  );
  const { owner, housingOwners } = useHousingOwners(housingId);
  const [updateOwner] = useUpdateOwnerMutation();
  const [updateHousingOwners] = useUpdateHousingOwnersMutation();

  const [housingOwnersModalKey, setHousingOwnersModalKey] = useState(
    new Date().getTime()
  );

  async function submitHousingOwnersUpdate(
    housingOwnersUpdated: HousingOwner[]
  ) {
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
    }
  }

  if (getHousingQuery.isSuccess && !housing) {
    return <NotFoundView />;
  }

  return (
    <Container maxWidth={false} sx={{ my: '2rem' }}>
      <HousingHeader
        className="fr-mb-3w"
        housing={housing}
        isLoading={getHousingQuery.isLoading}
      />

      <Grid container columnSpacing={3}>
        {/* Set a custom order to facilitate accessibility:
        housing first, owner second */}
        <Grid xs={8} order={2}>
          {housing && <HousingDetailsCard housing={housing} />}
        </Grid>
        <Grid
          xs={4}
          order={1}
          rowGap="1.5rem"
          sx={{ display: 'flex', flexFlow: 'column nowrap' }}
        >
          {housingOwners && (
            <OwnerCard
              owner={owner ?? null}
              housingCount={housingCount}
              modify={
                <HousingOwnersModal
                  housingId={housingId}
                  housingOwners={housingOwners}
                  onSubmit={submitHousingOwnersUpdate}
                  key={housingOwnersModalKey}
                  onCancel={() =>
                    setHousingOwnersModalKey(new Date().getTime())
                  }
                />
              }
            />
          )}
          <SecondaryOwnerList housingId={housingId} />
          <InactiveOwnerList housingId={housingId} />
        </Grid>
      </Grid>
    </Container>
  );
}

export default HousingView;
