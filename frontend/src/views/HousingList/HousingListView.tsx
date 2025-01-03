import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import Grid from '@mui/material/Unstable_Grid2';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';

import {
  TrackEventActions,
  TrackEventCategories
} from '../../models/TrackEvent';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppSelector } from '../../hooks/useStore';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import HousingListTabs from './HousingListTabs';
import HousingListMap from './HousingListMap';
import { HousingDisplaySwitch } from '../../components/HousingDisplaySwitch/HousingDisplaySwitch';
import HousingCreationModal from '../../components/modals/HousingCreationModal/HousingCreationModal';
import { useUser } from '../../hooks/useUser';
import { useFilters } from '../../hooks/useFilters';
import { initialHousingFilters } from '../../store/reducers/housingReducer';

const HousingListView = () => {
  useDocumentTitle('Parc de logements');
  const { trackEvent } = useMatomo();

  const {
    expand,
    filters,
    setExpand,
    setFilters,
    onChangeFilters,
    onResetFilters,
    removeFilter
  } = useFilters({
    storage: 'store',
    initialState: initialHousingFilters
  });

  const { view } = useAppSelector((state) => state.housing);

  const searchWithQuery = (query: string) => {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.Search,
      name: query
    });
    setFilters({
      ...filters,
      query
    });
  };

  const location: { state?: RouterState } = useLocation();
  const [alert, setAlert] = useState(location.state?.alert ?? '');
  function onFinish() {
    setAlert(
      'Le logement sélectionné a bien été ajouté à votre parc de logements.'
    );
  }

  const { isVisitor } = useUser();

  return (
    <Grid container position="relative">
      <HousingListFiltersSidemenu
        filters={filters}
        expand={expand}
        onChange={onChangeFilters}
        onReset={onResetFilters}
        onClose={() => setExpand(false)}
      />
      <Grid container flexDirection="column" px={3} py={4} xs>
        {alert && (
          <Grid xs>
            <Alert
              severity="success"
              description={alert}
              closable
              small
              className="fr-mb-2w"
            />
          </Grid>
        )}

        <Grid container mb={1} spacing={2} xs={12}>
          <Grid xs>
            <AppSearchBar
              onSearch={searchWithQuery}
              initialQuery={filters.query}
              placeholder="Rechercher (propriétaire, identifiant fiscal, ref. cadastrale...)"
            />
          </Grid>
          <Grid xs="auto">
            <HousingDisplaySwitch />
          </Grid>
          <Grid xs="auto">
            {!isVisitor && <HousingCreationModal onFinish={onFinish} />}
          </Grid>
        </Grid>

        <Grid mb={3} xs={12}>
          <HousingFiltersBadges filters={filters} onChange={removeFilter} />
        </Grid>

        <Grid mb={1} xs={12}>
          {view === 'map' ? (
            <HousingListMap filters={filters} />
          ) : (
            <HousingListTabs
              filters={filters}
              showCreateCampaign
              showCreateGroup
            />
          )}
        </Grid>
      </Grid>
    </Grid>
  );
};

interface RouterState {
  alert?: string;
}

export default HousingListView;
