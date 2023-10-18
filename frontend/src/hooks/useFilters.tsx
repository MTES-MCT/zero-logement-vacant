import { useMemo, useState } from 'react';
import housingSlice, {
  initialHousingFilters,
} from '../store/reducers/housingReducer';
import { HousingFilters } from '../models/HousingFilters';
import { TrackEventActions, TrackEventCategories } from '../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
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
  const { trackEvent } = useMatomo();
  const initialState = opts?.initialState ?? initialHousingFilters;

  const storage = opts?.storage ?? 'store';
  const store = useAppSelector((state) => state.housing);
  const state = useState<HousingFilters>(initialState);

  function changeFilters(filters: HousingFilters): void {
    dispatch(housingSlice.actions.changeFilters(filters));
  }

  const [filters, setFilters] =
    storage === 'store' ? [store.filters, changeFilters] : state;

  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );

  const { filtersExpanded: expand } = useAppSelector((state) => state.housing);
  const { expandFilters } = housingSlice.actions;

  function setExpand(value: boolean): void {
    dispatch(expandFilters(value));
  }

  function removeFilter(removed: HousingFilters) {
    setFilters({
      ...filters,
      ...removed,
    });
  }

  const length = useMemo<number>(() => Object.keys(filters).length, [filters]);

  function onChange(changed: HousingFilters, filterLabel?: string): void {
    setFilters({
      ...filters,
      ...changed,
    });
    if (filterLabel) {
      trackNewFilter(changed, filterLabel);
    }
  }

  function trackNewFilter(changedFilters: HousingFilters, filterLabel: string) {
    const filterEntry = Object.entries(changedFilters)[0];
    const prevFilterEntry = Object.entries(filters).find(
      (_) => _[0] === filterEntry[0]
    );
    const filterValues = filterEntry[1] as Array<string>;
    const prevFilterValues = prevFilterEntry
      ? (prevFilterEntry[1] as Array<string>)
      : [];
    const newValues = filterValues.filter
      ? filterValues.filter((_) => prevFilterValues?.indexOf(_) === -1)
      : [];
    if (newValues.length) {
      trackEvent({
        category: TrackEventCategories.Filter,
        action: TrackEventActions.Filter(filterLabel),
        name: newValues.toString(),
        value: establishment?.siren,
      });
    }
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
    setExpand,
  };
}
