import { useState } from 'react';
import { getHousingState, HousingStatus } from '../models/HousingState';

export function useStatusTabs(statusList: (HousingStatus | undefined)[]) {
  const [statusCounts, setStatusCounts] = useState<(number | undefined)[]>(
    new Array(7)
  );

  const setStatusCount = (status?: HousingStatus) => (count?: number) => {
    //Use of prevState is required to prevent concurrency issues
    setStatusCounts((prevState) => {
      const tmp = [...prevState];
      if (count !== undefined) {
        tmp.splice((status ?? -1) + 1, 1, count);
      }
      console.log('tmp', status, count, tmp);
      return tmp;
    });
  };

  const getTabLabel = (status?: HousingStatus) =>
    `${status !== undefined ? getHousingState(status).title : 'Tous'} (${
      statusCounts[(status ?? -1) + 1] ?? '...'
    })`;

  return { getTabLabel, setStatusCount };
}
