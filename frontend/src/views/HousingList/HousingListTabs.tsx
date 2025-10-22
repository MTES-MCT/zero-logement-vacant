import { fr } from '@codegouvfr/react-dsfr';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { HOUSING_STATUS_VALUES } from '@zerologementvacant/models';
import { kebabCase } from 'lodash-es';
import { useStatusTabs } from '../../hooks/useStatusTabs';
import { type HousingFilters } from '../../models/HousingFilters';

import { getHousingState } from '../../models/HousingState';
import HousingListTab from './HousingListTab';

interface Props {
  filters: HousingFilters;
  /**
   * @default true
   */
  showCount?: boolean;
  showRemoveGroupHousing?: boolean;
}

const HousingListTabs = ({
  filters,
  showCount,
  showRemoveGroupHousing
}: Props) => {
  const statuses = [
    { id: 'all', label: 'Tous', value: undefined },
    ...HOUSING_STATUS_VALUES.map((status) => {
      const label = getHousingState(status).title;
      return {
        id: kebabCase(label),
        label,
        value: status
      };
    })
  ];

  const { activeTab, getTabLabel, isActive, setActiveTab, setStatusCount } =
    useStatusTabs(statuses);

  const tabs = statuses.map((status) => ({
    tabId: status.id,
    label: getTabLabel(status)
  }));

  return (
    <Tabs
      classes={{
        panel: fr.cx('fr-p-0')
      }}
      className="tabs-no-border statusTabs"
      selectedTabId={activeTab}
      onTabChange={(tab: string) => setActiveTab(tab)}
      tabs={tabs}
    >
      {statuses.map((status) => (
        <HousingListTab
          filters={{ ...filters, status: status.value }}
          isActive={isActive(status)}
          key={`status-tab-${status.id}`}
          showCount={showCount}
          showRemoveGroupHousing={showRemoveGroupHousing}
          status={status.value}
          onCountFilteredHousing={setStatusCount(status)}
        />
      ))}
    </Tabs>
  );
};

export default HousingListTabs;
