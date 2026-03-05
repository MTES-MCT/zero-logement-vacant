import { fr } from '@codegouvfr/react-dsfr';
import Tabs from '@codegouvfr/react-dsfr/Tabs';

import { useStatusTabs } from '~/hooks/useStatusTabs';
import { type HousingFilters } from '~/models/HousingFilters';
import HousingListTab from './HousingListTab';

export interface HousingListTabsProps {
  filters: HousingFilters;
  /**
   * @default true
   */
  showCount?: boolean;
  showRemoveGroupHousing?: boolean;
}

function HousingListTabs({
  filters,
  showCount,
  showRemoveGroupHousing
}: Readonly<HousingListTabsProps>) {
  const { activeStatus, activeTab, tabs, setActiveTab } =
    useStatusTabs(filters);

  return (
    <Tabs
      classes={{
        panel: fr.cx('fr-p-0')
      }}
      className="tabs-no-border statusTabs"
      selectedTabId={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
    >
      <HousingListTab
        filters={{
          ...filters,
          status: activeStatus.value
        }}
        isActive={true}
        key={`status-tab-${activeStatus.id}`}
        showCount={showCount}
        showRemoveGroupHousing={showRemoveGroupHousing}
        status={activeStatus.value}
      />
    </Tabs>
  );
};

export default HousingListTabs;
