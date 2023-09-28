import { useMemo } from 'react';
import housingSlice, {
  initialHousingFilters,
} from '../store/reducers/housingReducer';
import { HousingFilters } from '../models/HousingFilters';
import { TrackEventActions, TrackEventCategories } from '../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { useAppDispatch, useAppSelector } from './useStore';

export function useFilters() {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { filters, filtersExpanded: expand } = useAppSelector(
    (state) => state.housing
  );
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );

  const { expandFilters, changeFilters } = housingSlice.actions;

  function setExpand(value: boolean): void {
    dispatch(expandFilters(value));
  }

  const length = useMemo<number>(() => Object.keys(filters).length, [filters]);

  function onChange(changed: HousingFilters, filterLabel?: string): void {
    dispatch(
      changeFilters({
        ...filters,
        ...changed,
      })
    );
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
    dispatch(changeFilters(initialHousingFilters));
  }

  return {
    expand,
    filters,
    length,
    onChangeFilters: onChange,
    onResetFilters: onReset,
    setExpand,
  };
}
