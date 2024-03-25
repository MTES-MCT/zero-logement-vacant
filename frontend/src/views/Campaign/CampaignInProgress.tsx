import Button from '@codegouvfr/react-dsfr/Button';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import React from 'react';

import { Col, Row } from '../../components/_dsfr';
import { filterCount } from '../../models/HousingFilters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFilters } from '../../hooks/useFilters';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import {
  TrackEventActions,
  TrackEventCategories,
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

function CampaignInProgress(props: Props) {
  useDocumentTitle(props.campaign.title);

  const { trackEvent } = useMatomo();
  const {
    filters,
    setFilters,
    expand,
    removeFilter,
    setExpand,
    onChangeFilters,
    onResetFilters,
  } = useFilters({
    storage: 'state',
    initialState: {
      campaignIds: [props.campaign.id],
    },
  });

  const { view } = useAppSelector((state) => state.housing);

  function searchWithQuery(query: string): void {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.HousingList.Search,
      name: query,
    });
    setFilters({
      ...filters,
      query,
    });
  }

  return (
    <section>
      <Row spacing="mb-1w" alignItems="top">
        <HousingListFiltersSidemenu
          filters={filters}
          expand={expand}
          onChange={onChangeFilters}
          onReset={onResetFilters}
          onClose={() => setExpand(false)}
        />
        <Col n="6" className="d-flex">
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
        <HousingListTabs filters={filters} showCount={false} />
      )}
    </section>
  );
}

export default CampaignInProgress;
