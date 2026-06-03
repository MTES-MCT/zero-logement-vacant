import { HousingStatus, Occupancy } from '@zerologementvacant/models';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { Provider as StoreProvider } from 'react-redux';

import {
  HousingFiltersProvider,
  useHousingFilters
} from '../HousingFiltersContext';
import configureTestStore from '../../utils/storeUtils';

function createWrapper(
  initialFilters?: Parameters<typeof HousingFiltersProvider>[0]['initialFilters']
) {
  const store = configureTestStore();

  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) => (
    <StoreProvider store={store}>
      <HousingFiltersProvider initialFilters={initialFilters}>
        {children}
      </HousingFiltersProvider>
    </StoreProvider>
  );
}

describe('HousingFiltersContext', () => {
  describe('initial state', () => {
    it('exposes the default initial filters when none are provided', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper()
      });

      expect(result.current.filters).toEqual({
        dataFileYearsIncluded: ['lovac-2026']
      });
      expect(result.current.expand).toBe(false);
    });

    it('exposes the provided initial filters', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper({ groupIds: ['group-1'] })
      });

      expect(result.current.filters).toEqual({ groupIds: ['group-1'] });
    });

    it('exposes a length derived from the number of filter keys', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper({
          groupIds: ['group-1'],
          occupancies: [Occupancy.VACANT]
        })
      });

      expect(result.current.length).toBe(2);
    });
  });

  describe('onChange', () => {
    it('merges partial updates with the previous filters', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper({ groupIds: ['group-1'] })
      });

      act(() => {
        result.current.onChange({ query: 'paris' });
      });

      expect(result.current.filters).toMatchObject({
        groupIds: ['group-1'],
        query: 'paris'
      });
    });

    it('prunes subStatus entries that no longer match the selected statusList', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper({
          statusList: [HousingStatus.FIRST_CONTACT],
          subStatus: ['Intérêt potentiel / En réflexion']
        })
      });

      act(() => {
        result.current.onChange({ statusList: [HousingStatus.NEVER_CONTACTED] });
      });

      expect(result.current.filters.subStatus).toEqual([]);
    });

    it('keeps subStatus entries that still match the selected statusList', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper({
          statusList: [HousingStatus.FIRST_CONTACT],
          subStatus: ['Intérêt potentiel / En réflexion']
        })
      });

      act(() => {
        result.current.onChange({ query: 'paris' });
      });

      expect(result.current.filters.subStatus).toEqual([
        'Intérêt potentiel / En réflexion'
      ]);
    });

    it('clears vacancyYears when occupancies no longer include VACANT', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper({
          occupancies: [Occupancy.VACANT],
          vacancyYears: ['2022']
        })
      });

      act(() => {
        result.current.onChange({ occupancies: [Occupancy.RENT] });
      });

      expect(result.current.filters.vacancyYears).toEqual([]);
    });

    it('preserves vacancyYears when occupancies still include VACANT', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper({
          occupancies: [Occupancy.VACANT],
          vacancyYears: ['2022']
        })
      });

      act(() => {
        result.current.onChange({
          occupancies: [Occupancy.VACANT, Occupancy.RENT]
        });
      });

      expect(result.current.filters.vacancyYears).toEqual(['2022']);
    });
  });

  describe('setFilters', () => {
    it('replaces the entire filters state without merging', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper({
          statusList: [HousingStatus.FIRST_CONTACT],
          subStatus: ['Intérêt potentiel / En réflexion']
        })
      });

      act(() => {
        result.current.setFilters({ campaignIds: ['campaign-1'] });
      });

      expect(result.current.filters).toEqual({
        campaignIds: ['campaign-1']
      });
    });
  });

  describe('onReset', () => {
    it('restores the initial filters', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper({ groupIds: ['group-1'] })
      });

      act(() => {
        result.current.onChange({ query: 'paris' });
      });
      act(() => {
        result.current.onReset();
      });

      expect(result.current.filters).toEqual({ groupIds: ['group-1'] });
    });
  });

  describe('setExpand', () => {
    it('updates the expand flag', () => {
      const { result } = renderHook(() => useHousingFilters(), {
        wrapper: createWrapper()
      });

      act(() => {
        result.current.setExpand(true);
      });

      expect(result.current.expand).toBe(true);
    });
  });

  describe('useHousingFilters', () => {
    it('throws when used outside a HousingFiltersProvider', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      expect(() => renderHook(() => useHousingFilters())).toThrow(
        /HousingFiltersProvider/
      );

      consoleError.mockRestore();
    });
  });

  describe('nested providers', () => {
    it('keeps the inner provider state independent from the outer one', () => {
      const store = configureTestStore();

      const wrapper = ({ children }: PropsWithChildren) => (
        <StoreProvider store={store}>
          <HousingFiltersProvider initialFilters={{ groupIds: ['outer'] }}>
            <HousingFiltersProvider initialFilters={{ groupIds: ['inner'] }}>
              {children}
            </HousingFiltersProvider>
          </HousingFiltersProvider>
        </StoreProvider>
      );

      const { result } = renderHook(() => useHousingFilters(), { wrapper });

      expect(result.current.filters).toEqual({ groupIds: ['inner'] });
    });
  });
});
