import React, { useState } from 'react';
import { Col, Row, Tabs } from '@dataesr/react-dsfr';
import { getHousingState, HousingStatus } from '../../models/HousingState';
import FilterBadges from '../../components/FiltersBadges/FiltersBadges';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import CampaignInProgressTab from './CampaignInProgressTab';

const CampaignInProgress = () => {
  const statusList = [
    HousingStatus.Waiting,
    HousingStatus.FirstContact,
    HousingStatus.InProgress,
    HousingStatus.Completed,
    HousingStatus.Blocked,
  ];

  const [query, setQuery] = useState<string>();
  const [statusCounts, setStatusCounts] = useState<(number | undefined)[]>(
    statusList.map((_) => undefined)
  );

  const setStatusCount = (status?: HousingStatus) => (count?: number) => {
    //Use of prevState is required to prevent concurrency issues
    setStatusCounts((prevState) => {
      const tmp = [...prevState];
      if (count !== undefined) {
        tmp.splice((status ?? -1) + 1, 1, count);
      }
      return tmp;
    });
  };

  const getTabLabel = (status?: HousingStatus) =>
    `${status !== undefined ? getHousingState(status).title : 'Tous'} (${
      statusCounts[(status ?? -1) + 1] ?? '...'
    })`;

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
        <Tabs className="tabs-no-border statusTabs">
          {statusList.map((status, index) => (
            <CampaignInProgressTab
              index={index}
              key={`status_tab_${index}`}
              label={getTabLabel(status)}
              status={status}
              query={query}
              onCountFilteredHousing={setStatusCount(status)}
            />
          ))}
        </Tabs>
      </Row>
    </>
  );
};

export default CampaignInProgress;
