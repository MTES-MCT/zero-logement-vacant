import { useState } from 'react';

import { HousingStatus } from '../models/HousingState';
import { HousingCount } from '../models/HousingCount';

interface Status {
  id: string;
  label: string;
  value: HousingStatus | undefined;
}

export function useStatusTabs(statuses: Status[]) {
  const [activeTab, setActiveTab] = useState(statuses[0].id);

  const [statusCounts, setStatusCounts] = useState<
    (HousingCount | undefined)[]
  >(new Array(statuses.length));

  const setStatusCount = (status: Status) => {
    return (count: HousingCount) => {
      // Use of prevState is required to prevent concurrency issues
      setStatusCounts((prevState) => {
        const tmp = [...prevState];
        const index = statuses.findIndex((s) => s.id === status.id);
        if (index === -1) {
          throw new Error('Not found');
        }
        tmp.splice(index, 1, count);
        return tmp;
      });
    };
  };

  function isActive(status: Status): boolean {
    return activeTab === status.id;
  }

  const getTabLabel = (status: Status): string => {
    const i = statuses.findIndex((s) => s.id === status.id);
    const count = statusCounts[i];
    return `${status.label} (${count?.housing ?? '...'})`;
  };

  return {
    activeTab,
    isActive,
    getTabLabel,
    setActiveTab,
    setStatusCount,
  };
}
