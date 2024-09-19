import { useMatomo } from '@jonkoops/matomo-tracker-react';
import Grid from '@mui/material/Unstable_Grid2';
import { useFilters } from '../../hooks/useFilters';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import {
  TrackEventActions,
  TrackEventCategories
} from '../../models/TrackEvent';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import HousingListMap from '../HousingList/HousingListMap';
import HousingListTabs from '../HousingList/HousingListTabs';
import { useAppSelector } from '../../hooks/useStore';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import { HousingDisplaySwitch } from '../../components/HousingDisplaySwitch/HousingDisplaySwitch';
import { Campaign } from '../../models/Campaign';

interface Props {
  campaign: Campaign;
}

function CampaignInProgress(props: Readonly<Props>) {
  const { trackEvent } = useMatomo();
  const {
    filters,
    setFilters,
    expand,
    removeFilter,
    setExpand,
    onChangeFilters,
    onResetFilters
  } = useFilters({
    storage: 'state',
    initialState: {
      campaignIds: [props.campaign.id]
    }
  });

  const { view } = useAppSelector((state) => state.housing);

  function searchWithQuery(query: string): void {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.HousingList.Search,
      name: query
    });
    setFilters({
      ...filters,
      query
    });
  }

  return (
    <>
      <HousingListFiltersSidemenu
        filters={filters}
        expand={expand}
        onChange={onChangeFilters}
        onReset={onResetFilters}
        onClose={() => setExpand(false)}
      />
      <Grid container flexDirection="column" px={3} py={4} xs>
        <Grid container mb={1} spacing={2} alignItems="flex-start" xs={12}>
          <Grid xs>
            <AppSearchBar
              onSearch={searchWithQuery}
              initialQuery={filters.query}
              placeholder="Rechercher (propriétaire, invariant, ref. cadastrale...)"
            />
          </Grid>
          <Grid xs="auto">
            <HousingDisplaySwitch />
          </Grid>
        </Grid>

        <Grid mb={3} xs={12}>
          <HousingFiltersBadges filters={filters} onChange={removeFilter} />
        </Grid>

        {view === 'map' ? (
          <HousingListMap filters={filters} />
        ) : (
          <HousingListTabs filters={filters} showCount={false} />
        )}
      </Grid>
    </>
  );
}

export default CampaignInProgress;
