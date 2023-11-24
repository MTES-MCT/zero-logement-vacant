import React, { useState } from 'react';
import { Col, Row, Title } from '../../components/_dsfr';

import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { useMatomo } from '@datapunt/matomo-tracker-react';

import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import { useFilters } from '../../hooks/useFilters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppSelector } from '../../hooks/useStore';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import { filterCount } from '../../models/HousingFilters';
import HousingListTabs from './HousingListTabs';
import HousingListMap from './HousingListMap';
import MainContainer from '../../components/MainContainer/MainContainer';
import Button from '@codegouvfr/react-dsfr/Button';
import GroupHeader from '../../components/GroupHeader/GroupHeader';
import { HousingDisplaySwitch } from '../../components/HousingDisplaySwitch/HousingDisplaySwitch';
import { useHistory } from 'react-router-dom';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import HousingCreationModal from '../../components/modals/HousingCreationModal/HousingCreationModal';

const HousingListView = () => {
  useDocumentTitle('Parc de logements');
  const { trackEvent } = useMatomo();

  const {
    filters,
    setFilters,
    expand,
    onChangeFilters,
    onResetFilters,
    setExpand,
    removeFilter,
  } = useFilters();

  const { view } = useAppSelector((state) => state.housing);

  const searchWithQuery = (query: string) => {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.Search,
    });
    setFilters({
      ...filters,
      query,
    });
  };

  const router = useHistory<RouterState | undefined>();
  const [alert, setAlert] = useState(router.location.state?.alert ?? '');
  function onFinish() {
    setAlert(
      'Le logement sélectionné a bien été ajouté à votre parc de logements.'
    );
  }

  return (
    <MainContainer>
      <HousingListFiltersSidemenu
        filters={filters}
        expand={expand}
        onChange={onChangeFilters}
        onReset={onResetFilters}
        onClose={() => setExpand(false)}
      />
      <Row spacing="mb-5w">
        <GroupHeader />
      </Row>
      <Row spacing="mb-2w">
        <Title as="h1" look="h3" className="fr-mr-2w fr-mb-0">
          Votre parc de logements
        </Title>
        <HousingCreationModal onFinish={onFinish} />
      </Row>

      {alert && (
        <Alert
          severity="success"
          description={alert}
          closable
          small
          className="fr-mb-2w"
        />
      )}

      <Row spacing="mb-1w">
        <Col n="6">
          <div className="d-flex">
            <AppSearchBar
              onSearch={searchWithQuery}
              initialQuery={filters.query}
              placeholder="Rechercher (propriétaire, invariant, ref. cadastrale...)"
            />
            <Button
              title="Filtrer"
              iconId="ri-filter-fill"
              priority="secondary"
              className="fr-ml-1w"
              onClick={() => setExpand(true)}
              data-testid="filter-button"
            >
              Filtrer ({filterCount(filters)})
            </Button>
          </div>
        </Col>

        <Col>
          <HousingDisplaySwitch />
        </Col>
      </Row>

      <Row>
        <HousingFiltersBadges
          filters={filters}
          onChange={removeFilter}
          onReset={onResetFilters}
        />
      </Row>

      {view === 'map' ? (
        <HousingListMap filters={filters} />
      ) : (
        <HousingListTabs filters={filters} showCreateCampaign showCreateGroup />
      )}
    </MainContainer>
  );
};

interface RouterState {
  alert?: string;
}

export default HousingListView;
