import Grid from '@mui/material/Grid2';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import { HousingDisplaySwitch } from '../../components/HousingDisplaySwitch/HousingDisplaySwitch';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import { useFilters } from '../../hooks/useFilters';
import { useAppSelector } from '../../hooks/useStore';
import { Campaign } from '../../models/Campaign';
import HousingListMap from '../HousingList/HousingListMap';
import HousingListTabs from '../HousingList/HousingListTabs';
import HousingListTabsProvider from '../HousingList/HousingListTabsProvider';

interface Props {
  campaign: Campaign;
}

function CampaignInProgress(props: Readonly<Props>) {
  const {
    filters,
    setFilters,
    expand,
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
    setFilters({
      ...filters,
      query
    });
  }

  return (
    <HousingListTabsProvider>
      <HousingListFiltersSidemenu
        filters={filters}
        expand={expand}
        onChange={onChangeFilters}
        onReset={onResetFilters}
        onClose={() => setExpand(false)}
      />
      <Grid container flexDirection="column" px={3} py={4} size="grow">
        <Grid container mb={1} spacing={2} alignItems="flex-start" size={12}>
          <Grid size="grow">
            <AppSearchBar
              onSearch={searchWithQuery}
              initialQuery={filters.query}
              placeholder="Rechercher (propriétaire, identifiant fiscal, ref. cadastrale...)"
            />
          </Grid>
          <Grid size="auto">
            <HousingDisplaySwitch />
          </Grid>
        </Grid>

        <Grid mb={3} size={12}>
          <HousingFiltersBadges filters={filters} onChange={onChangeFilters} />
        </Grid>

        {view === 'map' ? (
          <HousingListMap filters={filters} />
        ) : (
          <HousingListTabs filters={filters} showCount={false} />
        )}
      </Grid>
    </HousingListTabsProvider>
  );
}

export default CampaignInProgress;
