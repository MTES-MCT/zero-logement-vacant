import { useState } from 'react';
import { getHousingState, HousingStatus } from '../models/HousingState';

export function useStatusTabs(statusList: (HousingStatus | undefined)[]) {
  const [statusCounts, setStatusCounts] = useState<(number | undefined)[]>(
    new Array(statusList.length)
  );

  const setStatusCount = (status?: HousingStatus) => (count?: number) => {
    //Use of prevState is required to prevent concurrency issues
    setStatusCounts((prevState) => {
      const tmp = [...prevState];
      tmp.splice((status ?? -1) + 1, 1, count);
      return tmp;
    });
  };

  const getTabLabel = (status?: HousingStatus) =>
    `${status !== undefined ? getHousingState(status).title : 'Tous'} (${
      statusCounts[(status ?? -1) + 1] ?? '...'
    })`;

  return { getTabLabel, setStatusCount };
}
