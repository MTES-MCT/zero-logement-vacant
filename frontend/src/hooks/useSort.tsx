import React, { useState } from 'react';

import { Direction, Sort } from '../models/Sort';
import Button from '@codegouvfr/react-dsfr/Button';
import { match } from 'ts-pattern';
import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';

interface UseSortOptions<Sortable extends object> {
  onSort?(sort: Sort<Sortable>): void | Promise<void>;
  default?: Sort<Sortable>;
}

export function useSort<Sortable extends object>(
  options?: UseSortOptions<Sortable>
) {
  const [sort, setSort] = useState<Sort<Sortable> | undefined>(
    options?.default
  );

  function getSortButton(
    key: keyof Sortable,
    title: string
  ): React.ReactElement {
    const direction: Direction | undefined = sort?.[key];
    return (
      <Button
        iconId={match(direction)
          .returnType<FrIconClassName | RiIconClassName>()
          .with('asc', () => 'fr-icon-arrow-up-line')
          .with('desc', () => 'fr-icon-arrow-down-line')
          .otherwise(() => 'fr-icon-arrow-up-down-line')}
        priority="tertiary"
        size="small"
        title={title}
        onClick={() => cycleSort(key)}
      />
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
      const value = Object.keys(sort ?? {})
        .filter((k) => k !== key)
        .reduce<Sort<Sortable>>((acc, k) => {
          return {
            ...acc,
            [k]: sort ? sort[k as keyof Sortable] : undefined
          };
        }, {});
      setSort(value);
      options?.onSort?.(value);
      return;
    }

    const value: Sort<Sortable> = { ...sort, [key]: next };
    setSort(value);
    options?.onSort?.(value);
  }

  return {
    cycleSort,
    getSortButton,
    sort,
    setSort
  };
}
