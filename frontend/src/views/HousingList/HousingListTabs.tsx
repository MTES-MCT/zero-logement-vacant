import { HousingStatus } from '../../models/HousingState';
import React from 'react';
import HousingListTab from './HousingListTab';
import { HousingFilters } from '../../models/HousingFilters';
import { useStatusTabs } from '../../hooks/useStatusTabs';
import Tabs from '@codegouvfr/react-dsfr/Tabs';

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
    <Tabs
      className="tabs-no-border statusTabs fr-mt-2w"
      tabs={statusList.map((status) => ({
        label: getTabLabel(status),
        content: (
          <HousingListTab
            key={`status_tab_${status}`}
            status={status}
            filters={{
              ...filters,
              status,
            }}
            onCountFilteredHousing={setStatusCount(status)}
          />
        ),
      }))}
    />
  );
};

export default HousingListTabs;
