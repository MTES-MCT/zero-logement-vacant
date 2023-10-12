import { useEffect, useState } from 'react';

import { Direction, Sort } from '../models/Sort';
import Button from '@codegouvfr/react-dsfr/Button';
import classNames from 'classnames';

interface UseSortOptions<Sortable extends object> {
  onSort?(sort: Sort<Sortable>): void | Promise<void>;
}

export function useSort<Sortable extends object>(
  options?: UseSortOptions<Sortable>
) {
  const [sort, setSort] = useState<Sort<Sortable>>();

  function getSortButton(key: keyof Sortable, title: string): JSX.Element {
    const direction = sort?.[key];
    return (
      <Button
        iconId={
          (direction ?? 'asc') === 'asc'
            ? 'fr-icon-arrow-up-line'
            : 'fr-icon-arrow-down-line'
        }
        iconPosition="right"
        children={title}
        priority="tertiary no outline"
        size="small"
        className={classNames('fr-pl-0', { 'no-sort': !direction })}
        style={{ color: 'var(--text-title-grey)' }}
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
    getSortButton,
    sort,
    setSort,
  };
}
