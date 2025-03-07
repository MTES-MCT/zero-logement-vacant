import { useMemo, useState } from 'react';
import housingSlice, {
  initialHousingFilters
} from '../store/reducers/housingReducer';
import { HousingFilters } from '../models/HousingFilters';
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

  function removeFilter(removed: HousingFilters) {
    setFilters({
      ...filters,
      ...removed
    });
  }

  const length = useMemo<number>(() => Object.keys(filters).length, [filters]);

  function onChange(changed: HousingFilters): void {
    setFilters({
      ...filters,
      ...changed
    });
  }

  function onReset(): void {
    setFilters(initialState);
  }

  return {
    expand,
    filters,
    setFilters,
    length,
    removeFilter,
    onChangeFilters: onChange,
    onResetFilters: onReset,
    setExpand
  };
}
