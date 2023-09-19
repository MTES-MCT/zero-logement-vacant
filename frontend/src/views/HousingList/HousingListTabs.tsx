import { getHousingState, HousingStatus } from '../../models/HousingState';
import { Tabs } from '@dataesr/react-dsfr';
import React, { useState } from 'react';
import HousingListTab from './HousingListTab';
import { HousingFilters } from '../../models/HousingFilters';

interface Props {
  filters: HousingFilters;
}

const HousingListTabs = ({ filters }: Props) => {
  const statusList = [
    undefined,
    HousingStatus.NeverContacted,
    HousingStatus.Waiting,
    HousingStatus.FirstContact,
    HousingStatus.InProgress,
    HousingStatus.Completed,
    HousingStatus.Blocked,
  ];

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
    <Tabs className="tabs-no-border statusTabs fr-mt-2w">
      {statusList.map((status, index) => (
        <HousingListTab
          index={index}
          key={`status_tab_${status}`}
          label={getTabLabel(status)}
          status={status}
          filters={{
            ...filters,
            status,
          }}
          onCountFilteredHousing={setStatusCount(status)}
        />
      ))}
    </Tabs>
  );
};

export default HousingListTabs;
