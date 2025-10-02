import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom';
import { match } from 'ts-pattern';

import OwnerHousingCard from '~/components/Owner/OwnerHousingCardNext';
import { getBuildingLocation, type BuildingLocation } from '~/models/Housing';
import { useFindOwnerHousingsQuery } from '~/services/owner-housing.service';

function OwnerHousingCardGrid() {
  const params = useParams<{ id: string }>();
  const { data: ownerHousings, isLoading } = useFindOwnerHousingsQuery(
    params.id ?? skipToken
  );

  if (isLoading) {
    return (
      <Stack spacing="1.5rem" useFlexGap>
        <Skeleton
          animation="wave"
          variant="text"
          sx={{ fontSize: '1.75rem' }}
        />
        <Grid container spacing="1rem">
          {Array.from({ length: 2 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <Skeleton
                animation="wave"
                variant="rectangular"
                height="30.25rem"
              />
            </Grid>
          ))}
        </Grid>
      </Stack>
    );
  }

  if (!ownerHousings || ownerHousings.length === 0) {
    return (
      <Typography>
        Aucun logement identifié dans Zéro Logement Vacant
      </Typography>
    );
  }

  function formatAdditionalAddress(
    buildingLocation: BuildingLocation | null
  ): string | null {
    if (!buildingLocation) {
      return null;
    }

    return [
      buildingLocation.building,
      buildingLocation.entrance,
      buildingLocation.level,
      buildingLocation.local
    ]
      .filter((part) => !!part)
      .join(', ');
  }

  const count = ownerHousings.length;
  const identified = match(count)
    .with(0, () => 'Aucun logement identifié')
    .with(1, () => '1 logement identifié')
    .otherwise((n) => `${n} logements identifiés`);

  return (
    <Stack spacing="1.5rem" useFlexGap>
      <Typography component="h2" variant="h6">
        {identified} dans Zéro Logement Vacant
      </Typography>

      <Grid container spacing="1rem">
        {ownerHousings.map((ownerHousing) => (
          <Grid key={ownerHousing.id} size={{ xs: 12, md: 6 }}>
            <OwnerHousingCard
              id={ownerHousing.id}
              propertyRight={ownerHousing.propertyRight}
              rank={ownerHousing.rank}
              address={ownerHousing.rawAddress.join(', ')}
              additionalAddress={formatAdditionalAddress(
                getBuildingLocation(ownerHousing) ?? null
              )}
              localId={ownerHousing.localId}
              kind={ownerHousing.housingKind}
              surface={ownerHousing.livingArea}
              occupancy={ownerHousing.occupancy}
              status={ownerHousing.status}
            />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

export default OwnerHousingCardGrid;
