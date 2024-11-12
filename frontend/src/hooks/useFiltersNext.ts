import { useState } from 'react';

import { HousingFiltersDTO } from '@zerologementvacant/models';
import { useToggle } from './useToggle';

export interface UseFiltersOptions {
  initialFilters: HousingFiltersDTO;
}

export function useFilters(options: UseFiltersOptions) {
  const [filters, setFilters] = useState<HousingFiltersDTO>(
    options.initialFilters
  );

  function remove(key: keyof HousingFiltersDTO): void {
    setFilters((filters: HousingFiltersDTO) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _, ...rest } = filters;
      return rest;
    });
  }

  const {
    active: expand,
    setActive: setExpand,
    toggle: toggleExpand
  } = useToggle(false);

  function removeFilters(value: HousingFiltersDTO): void {
    Object.keys(value).forEach((key) => {
      remove(key as keyof HousingFiltersDTO);
    });
  }

  function resetFilters(): void {
    setFilters(options.initialFilters);
  }

  return {
    expand,
    filters,
    setExpand,
    toggleExpand,
    setFilters,
    removeFilters,
    resetFilters
  };
}
