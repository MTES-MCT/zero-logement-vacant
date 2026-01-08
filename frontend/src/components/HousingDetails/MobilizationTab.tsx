import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { Predicate } from 'effect';
import { type ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';

import { useHousing } from '~/hooks/useHousing';
import { lastUpdate } from '~/models/Housing';
import { useFindCampaignsQuery } from '~/services/campaign.service';
import { useFindPrecisionsByHousingQuery } from '~/services/precision.service';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import PrecisionLists from '../Precision/PrecisionLists';
import HousingAttribute from './HousingAttribute';

function MobilizationTab() {
  const { housing } = useHousing();
  const findCampaignsQuery = useFindCampaignsQuery();
  const { data: housingPrecisions } = useFindPrecisionsByHousingQuery(
    housing ? { housingId: housing.id } : skipToken
  );

  const updated = lastUpdate();

  if (!housing) {
    return null;
  }

  return (
    <Stack component="section" spacing="2rem">
      <Stack component="article" spacing="0.75rem">
        <Typography
          component="h3"
          variant="body1"
          sx={{ fontSize: '1.125rem', fontWeight: 700 }}
        >
          Informations sur le suivi du logement
        </Typography>

        <HousingAttribute
          label="Statut de suivi"
          value={<HousingStatusBadge inline status={housing.status} />}
        />
        <HousingAttribute
          label="Sous-statut de suivi"
          value={housing.subStatus}
          fallback="Pas applicable"
        />
        <HousingAttribute
          label="Dernière mise à jour"
          value={updated ?? 'Aucune mise à jour'}
        />
        {match(findCampaignsQuery)
          .returnType<ReactNode>()
          .with({ isLoading: true }, () => (
            <Skeleton animation="wave" variant="text" />
          ))
          .with(
            { isLoading: false, data: Pattern.nonNullable },
            ({ data: campaigns }) => {
              const housingCampaigns =
                housing.campaignIds
                  ?.map((id) =>
                    campaigns.find((campaign) => campaign.id === id)
                  )
                  ?.filter(Predicate.isNotUndefined) ?? [];

              return (
                <HousingAttribute
                  label={`Campagnes (${housingCampaigns.length})`}
                  value={
                    housingCampaigns.length === 0 ? (
                      <Typography>Aucune campagne</Typography>
                    ) : (
                      housingCampaigns.map((campaign) => (
                        <Typography key={campaign.id}>
                          {campaign.title}
                        </Typography>
                      ))
                    )
                  }
                />
              );
            }
          )
          .otherwise(() => null)}
      </Stack>

      <Stack component="article">
        <PrecisionLists writable={false} value={housingPrecisions ?? []} />
      </Stack>
    </Stack>
  );
}

export default MobilizationTab;
