import { Icon } from '@dataesr/react-dsfr';
import { useEffect, useState } from 'react';

import { Direction, Sort } from '../models/Sort';

interface UseSortOptions<Sortable extends object> {
  onSort?(sort: Sort<Sortable>): void | Promise<void>;
}

export function useSort<Sortable extends object>(
  options?: UseSortOptions<Sortable>
) {
  const [sort, setSort] = useState<Sort<Sortable>>();

  function getIcon(key: keyof Sortable): JSX.Element {
    const direction = sort?.[key];
    return direction ? (
      <Icon
        name={direction === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line'}
        color="var(--text-title-grey)"
      />
    ) : (
      <Icon name="ri-arrow-up-line" color="var(--grey-main-525)" />
    );
  }

  function nextDirection(key: keyof Sortable): Direction | undefined {
    const directions: (Direction | undefined)[] = [undefined, 'desc', 'asc'];
    const direction = sort?.[key];
    const index = directions.findIndex((_) => _ === direction);
    const nextIndex = index < directions.length - 1 ? index + 1 : 0;
    return directions[nextIndex];
  }

  function cycleSort(key: keyof Sortable): void {
    const next = nextDirection(key);
    if (!next) {
      // Filter out undefined values
      setSort(
        Object.keys(sort ?? {})
          .filter((k) => k !== key)
          .reduce<Sort<Sortable>>((acc, k) => {
            return {
              ...acc,
              [k]: sort ? sort[k as keyof Sortable] : undefined,
            };
          }, {})
      );
      return;
    }
    setSort({ ...sort, [key]: next });
  }

  useEffect(() => {
    if (sort) {
      options?.onSort?.(sort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  return {
    cycleSort,
    getIcon,
    sort,
    setSort,
  };
}
