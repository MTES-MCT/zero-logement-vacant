import Tabs from '@codegouvfr/react-dsfr/Tabs';
import fp from 'lodash/fp';

import { getHousingState, HOUSING_STATUSES } from '../../models/HousingState';
import HousingListTab from './HousingListTab';
import { HousingFilters } from '../../models/HousingFilters';
import { useStatusTabs } from '../../hooks/useStatusTabs';

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
  const statuses = [
    { id: 'all', label: 'Tous', value: undefined, },
    ...HOUSING_STATUSES.map((status) => {
      const label = getHousingState(status).title;
      return {
        id: fp.kebabCase(label),
        label,
        value: status,
      };
    })
  ];

  const { activeTab, getTabLabel, isActive, setActiveTab, setStatusCount, } =
    useStatusTabs(statuses);

  const tabs = statuses.map((status) => ({
    tabId: status.id,
    label: getTabLabel(status),
  }));

  return (
    <Tabs
      className="tabs-no-border statusTabs"
      selectedTabId={activeTab}
      onTabChange={(tab: string) => setActiveTab(tab)}
      tabs={tabs}
    >
      {statuses.map((status) => (
        <HousingListTab
          filters={{ ...filters, status: status.value, }}
          isActive={isActive(status)}
          key={`status-tab-${status.id}`}
          showCount={showCount}
          showCreateGroup={showCreateGroup}
          showRemoveGroupHousing={showRemoveGroupHousing}
          showCreateCampaign={showCreateCampaign}
          status={status.value}
          onCountFilteredHousing={setStatusCount(status)}
        />
      ))}
    </Tabs>
  );
};

export default HousingListTabs;
