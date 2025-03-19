import { Occupancy } from '@zerologementvacant/models';
import { Set } from 'immutable';
import { useMemo, useState } from 'react';

import { HousingFilters } from '../models/HousingFilters';
import { getSubStatuses } from '../models/HousingState';
import housingSlice, {
  initialHousingFilters
} from '../store/reducers/housingReducer';
import { useIntercommunalities } from './useIntercommunalities';
import { useAppDispatch, useAppSelector } from './useStore';

interface FiltersOptions {
  /**
   * @default store
   */
  storage?: 'store' | 'state';
  initialState?: HousingFilters;
}

export function useFilters(opts?: FiltersOptions) {
  const dispatch = useAppDispatch();
  const initialState = opts?.initialState ?? initialHousingFilters;

  const storage = opts?.storage ?? 'store';
  const store = useAppSelector((state) => state.housing);
  const state = useState<HousingFilters>(initialState);

  function changeFilters(filters: HousingFilters): void {
    dispatch(housingSlice.actions.changeFilters(filters));
  }

  const [filters, setFilters] =
    storage === 'store' ? [store.filters, changeFilters] : state;

  const { filtersExpanded: expand } = useAppSelector((state) => state.housing);
  const { expandFilters } = housingSlice.actions;

  function setExpand(value: boolean): void {
    dispatch(expandFilters(value));
  }

  const length = useMemo<number>(() => Object.keys(filters).length, [filters]);

  const { data: intercommunalities } = useIntercommunalities();

  function onChange(changed: HousingFilters): void {
    const changes = { ...filters, ...changed };

    // Sub-statuses depend on the statuses
    const allowedSubStatuses =
      changes.statusList?.flatMap(getSubStatuses) ?? [];
    changes.subStatus = changes.subStatus?.filter((subStatus) =>
      allowedSubStatuses.includes(subStatus)
    );

    // The `vacancyYears` filter should be available
    // only when the `VACANT` occupancy is selected
    if (!changes.occupancies?.includes(Occupancy.VACANT)) {
      changes.vacancyYears = [];
    }

    if (changes.intercommunalities?.length && intercommunalities) {
      // Remove unavailable localities
      changes.localities = Set(changes.localities)
        .intersect(
          intercommunalities
            .filter((intercommunality) =>
              changes.intercommunalities?.includes(intercommunality.id)
            )
            .flatMap((intercommunality) => intercommunality.geoCodes)
        )
        .toArray();
    }

    setFilters(changes);
  }

  function onReset(): void {
    setFilters(initialState);
  }

  return {
    expand,
    filters,
    setFilters,
    length,
    onChangeFilters: onChange,
    onResetFilters: onReset,
    setExpand
  };
}
