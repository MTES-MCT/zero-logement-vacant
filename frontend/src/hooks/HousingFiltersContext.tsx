import { Occupancy } from '@zerologementvacant/models';
import { Set } from 'immutable';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';

import type { HousingFilters } from '../models/HousingFilters';
import { getSubStatuses } from '../models/HousingState';
import { useIntercommunalities } from './useIntercommunalities';

export const initialHousingFilters: HousingFilters = {
  dataFileYearsIncluded: ['lovac-2026']
};

interface HousingFiltersContextValue {
  filters: HousingFilters;
  expand: boolean;
  length: number;
  onChange: (changed: HousingFilters) => void;
  onReset: () => void;
  setExpand: (value: boolean) => void;
  setFilters: (filters: HousingFilters) => void;
}

const HousingFiltersContext = createContext<HousingFiltersContextValue | null>(
  null
);

interface HousingFiltersProviderProps {
  initialFilters?: HousingFilters;
  children: ReactNode;
}

export function HousingFiltersProvider({
  initialFilters,
  children
}: HousingFiltersProviderProps) {
  const [initial] = useState<HousingFilters>(
    () => initialFilters ?? initialHousingFilters
  );

  const [filters, setFilters] = useState<HousingFilters>(initial);
  const [expand, setExpand] = useState(false);

  const { data: intercommunalities } = useIntercommunalities();

  const onChange = useCallback(
    (changed: HousingFilters): void => {
      setFilters((previous) => {
        const next: HousingFilters = { ...previous, ...changed };

        const allowedSubStatuses =
          next.statusList?.flatMap(getSubStatuses) ?? [];
        next.subStatus = next.subStatus?.filter((subStatus) =>
          allowedSubStatuses.includes(subStatus)
        );

        if (!next.occupancies?.includes(Occupancy.VACANT)) {
          next.vacancyYears = [];
        }

        if (next.intercommunalities?.length && intercommunalities) {
          next.localities = Set(next.localities)
            .intersect(
              intercommunalities
                .filter((intercommunality) =>
                  next.intercommunalities?.includes(intercommunality.id)
                )
                .flatMap((intercommunality) => intercommunality.geoCodes)
            )
            .toArray();
        }

        return next;
      });
    },
    [intercommunalities]
  );

  const onReset = useCallback(() => {
    setFilters(initial);
  }, [initial]);

  const value = useMemo<HousingFiltersContextValue>(
    () => ({
      filters,
      expand,
      length: Object.keys(filters).length,
      onChange,
      onReset,
      setExpand,
      setFilters
    }),
    [filters, expand, onChange, onReset]
  );

  return (
    <HousingFiltersContext.Provider value={value}>
      {children}
    </HousingFiltersContext.Provider>
  );
}

export function useHousingFilters(): HousingFiltersContextValue {
  const context = useContext(HousingFiltersContext);
  if (!context) {
    throw new Error(
      'useHousingFilters must be used within a HousingFiltersProvider'
    );
  }
  return context;
}
