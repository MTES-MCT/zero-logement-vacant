import type { TabsProps } from '@codegouvfr/react-dsfr/Tabs';
import {
  HOUSING_STATUS_LABELS,
  HousingStatus,
  toHousingStatusId
} from '@zerologementvacant/models';
import { Array, Number, pipe } from 'effect';
import type { ElementOf } from 'ts-essentials';
import { match, Pattern } from 'ts-pattern';

import type { HousingFilters } from '~/models/HousingFilters';
import { useCountHousingQuery } from '~/services/housing.service';
import { useHousingListTabs } from '~/views/HousingList/HousingListTabsProvider';

function createTab(
  status: HousingStatus,
  query: ReturnType<typeof useCountHousingQuery>
): ElementOf<TabsProps.Controlled['tabs']> {
  return {
    tabId: toHousingStatusId(status),
    label: match(query)
      .with({ isLoading: true }, () => `${HOUSING_STATUS_LABELS[status]} (...)`)
      .with(
        { isSuccess: true, data: Pattern.nonNullable.select() },
        (count) => `${HOUSING_STATUS_LABELS[status]} (${count.housing})`
      )
      .otherwise(() => null)
  };
}

export function useStatusTabs(filters: HousingFilters) {
  const { activeStatus, activeTab, setActiveTab } = useHousingListTabs();

  const countNeverContactedQuery = useCountHousingQuery({
    ...filters,
    status: HousingStatus.NEVER_CONTACTED
  });
  const countWaitingQuery = useCountHousingQuery({
    ...filters,
    status: HousingStatus.WAITING
  });
  const countFirstContactQuery = useCountHousingQuery({
    ...filters,
    status: HousingStatus.FIRST_CONTACT
  });
  const countInProgressQuery = useCountHousingQuery({
    ...filters,
    status: HousingStatus.IN_PROGRESS
  });
  const countCompletedQuery = useCountHousingQuery({
    ...filters,
    status: HousingStatus.COMPLETED
  });
  const countBlockedQuery = useCountHousingQuery({
    ...filters,
    status: HousingStatus.BLOCKED
  });
  const queries = [
    countNeverContactedQuery,
    countWaitingQuery,
    countFirstContactQuery,
    countInProgressQuery,
    countCompletedQuery,
    countBlockedQuery
  ];

  const sum: number | null = queries.every((query) => query.isSuccess)
    ? pipe(
        queries,
        Array.map((query) => query.data.housing),
        Number.sumAll
      )
    : null;

  const tabs: TabsProps.Controlled['tabs'] = [
    {
      tabId: 'all',
      label: sum !== null ? `Tous (${sum})` : 'Tous'
    },
    createTab(HousingStatus.NEVER_CONTACTED, countNeverContactedQuery),
    createTab(HousingStatus.WAITING, countWaitingQuery),
    createTab(HousingStatus.FIRST_CONTACT, countFirstContactQuery),
    createTab(HousingStatus.IN_PROGRESS, countInProgressQuery),
    createTab(HousingStatus.COMPLETED, countCompletedQuery),
    createTab(HousingStatus.BLOCKED, countBlockedQuery)
  ];

  return {
    activeStatus,
    activeTab,
    tabs,
    setActiveTab
  };
}
