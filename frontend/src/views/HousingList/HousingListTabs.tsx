import { HousingStatus } from '../../models/HousingState';
import { Tabs } from '@dataesr/react-dsfr';
import React from 'react';
import HousingListTab from './HousingListTab';
import { HousingFilters } from '../../models/HousingFilters';
import { useStatusTabs } from '../../hooks/useStatusTabs';

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

  const { getTabLabel, setStatusCount } = useStatusTabs(statusList);

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
