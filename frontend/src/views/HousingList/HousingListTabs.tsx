import { HOUSING_STATUSES } from '../../models/HousingState';
import React from 'react';
import HousingListTab from './HousingListTab';
import { HousingFilters } from '../../models/HousingFilters';
import { useStatusTabs } from '../../hooks/useStatusTabs';
import Tabs from '@codegouvfr/react-dsfr/Tabs';

interface Props {
  filters: HousingFilters;
  /**
   * @default true
   */
  showCount?: boolean;
  showCreateGroup?: boolean;
  showRemoveGroupHousing?: boolean;
  showCreateCampaign?: boolean;
}

const HousingListTabs = ({
  filters,
  showCount,
  showCreateGroup,
  showRemoveGroupHousing,
  showCreateCampaign,
}: Props) => {
  const statuses = HOUSING_STATUSES;

  const {
    activeTab,
    getTabId,
    getTabLabel,
    isActive,
    setActiveTab,
    setStatusCount,
  } = useStatusTabs(statuses);

  const tabs = statuses.map((status) => ({
    tabId: getTabId(status),
    label: getTabLabel(status),
  }));

  return (
    <Tabs
      className="tabs-no-border statusTabs fr-mt-2w"
      selectedTabId={getTabId(activeTab)}
      onTabChange={(tab: string) => setActiveTab(Number(tab))}
      tabs={tabs}
    >
      {statuses.map((status) => (
        <HousingListTab
          key={`status_tab_${status}`}
          isActive={isActive(status)}
          status={status}
          showCount={showCount}
          showCreateGroup={showCreateGroup}
          showRemoveGroupHousing={showRemoveGroupHousing}
          showCreateCampaign={showCreateCampaign}
          filters={{ ...filters, status }}
          onCountFilteredHousing={setStatusCount(status)}
        />
      ))}
    </Tabs>
  );
};

export default HousingListTabs;
