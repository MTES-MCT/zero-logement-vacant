import type { TabsProps } from '@codegouvfr/react-dsfr/Tabs';
import {
  HOUSING_STATUS_LABELS,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  toHousingStatusId
} from '@zerologementvacant/models';
import { Array, Number, pipe } from 'effect';
import type { ElementOf } from 'ts-essentials';
import { match } from 'ts-pattern';

import type { HousingFilters } from '~/models/HousingFilters';
import { useCountHousingByStatusQuery } from '~/services/housing.service';
import { useHousingListTabs } from '~/views/HousingList/HousingListTabsProvider';

function createTab(
  status: HousingStatus,
  query: ReturnType<typeof useCountHousingByStatusQuery>
): ElementOf<TabsProps.Controlled['tabs']> {
  return {
    tabId: toHousingStatusId(status),
    label: match(query)
      .with({ isLoading: true }, () => `${HOUSING_STATUS_LABELS[status]} (...)`)
      .with(
        { isSuccess: true },
        ({ data }) =>
          `${HOUSING_STATUS_LABELS[status]} (${data[status]?.housing ?? 0})`
      )
      .otherwise(() => null)
  };
}

export function useStatusTabs(filters: HousingFilters) {
  const { activeStatus, activeTab, setActiveTab } = useHousingListTabs();

  const query = useCountHousingByStatusQuery(filters);

  const sum: number | null = query.isSuccess
    ? pipe(
        HOUSING_STATUS_VALUES,
        Array.map((status) => query.data[status]?.housing ?? 0),
        Number.sumAll
      )
    : null;

  const tabs: TabsProps.Controlled['tabs'] = [
    {
      tabId: 'all',
      label: sum !== null ? `Tous (${sum})` : 'Tous'
    },
    createTab(HousingStatus.NEVER_CONTACTED, query),
    createTab(HousingStatus.WAITING, query),
    createTab(HousingStatus.FIRST_CONTACT, query),
    createTab(HousingStatus.IN_PROGRESS, query),
    createTab(HousingStatus.COMPLETED, query),
    createTab(HousingStatus.BLOCKED, query)
  ];

  return {
    activeStatus,
    activeTab,
    tabs,
    setActiveTab
  };
}
