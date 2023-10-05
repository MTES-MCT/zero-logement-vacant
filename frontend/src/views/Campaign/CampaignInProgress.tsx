import React, { useState } from 'react';
import { Col, Row } from '../../components/_dsfr/index';
import { HousingStatus } from '../../models/HousingState';
import FilterBadges from '../../components/FiltersBadges/FiltersBadges';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import CampaignInProgressTab from './CampaignInProgressTab';
import { useStatusTabs } from '../../hooks/useStatusTabs';
import Tabs from '@codegouvfr/react-dsfr/Tabs';

const CampaignInProgress = () => {
  const statusList = [
    HousingStatus.Waiting,
    HousingStatus.FirstContact,
    HousingStatus.InProgress,
    HousingStatus.Completed,
    HousingStatus.Blocked,
  ];

  const [query, setQuery] = useState<string>();

  const { getTabLabel, setStatusCount } = useStatusTabs(statusList);

  return (
    <>
      <Row spacing="mb-4w">
        <Col n="3">
          <AppSearchBar
            onSearch={(input: string) => {
              setQuery(input);
            }}
          />
        </Col>
      </Row>
      {query && (
        <Row className="fr-pb-2w">
          <Col>
            <FilterBadges
              options={[{ value: query, label: query }]}
              filters={[query]}
              onChange={() => setQuery('')}
            />
          </Col>
        </Row>
      )}
      <Row>
        <Tabs
          className="tabs-no-border statusTabs"
          tabs={statusList.map((status) => ({
            label: getTabLabel(status),
            content: (
              <CampaignInProgressTab
                key={`status_tab_${status}`}
                status={status}
                query={query}
                onCountFilteredHousing={setStatusCount(status)}
              />
            ),
          }))}
        />
      </Row>
    </>
  );
};

export default CampaignInProgress;
