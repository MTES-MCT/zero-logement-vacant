import { useCallback, useEffect, useState } from 'react';

import { getHousingState, HousingStatus } from '../models/HousingState';

export function useStatusTabs(statuses: HousingStatus[]) {
  const [activeTab, setActiveTab] = useState(statuses[0]);

  const [statusCounts, setStatusCounts] = useState<(number | undefined)[]>(
    new Array(statuses.length)
  );

  const setStatusCount = (status: HousingStatus) => {
    return (count: number) => {
      // Use of prevState is required to prevent concurrency issues
      setStatusCounts((prevState) => {
        const tmp = [...prevState];
        tmp.splice(status, 1, count);
        return tmp;
      });
    };
  };

  function isActive(status: HousingStatus): boolean {
    return activeTab === status;
  }

  function getTabId(status: HousingStatus): string {
    return status.toString();
  }

  const getTabLabel = (status: HousingStatus) => {
    const count = statusCounts[status];
    return `${getHousingState(status).title} (${count ?? '...'})`;
  };

  return {
    activeTab,
    isActive,
    getTabId,
    getTabLabel,
    setActiveTab,
    setStatusCount,
  };
}
