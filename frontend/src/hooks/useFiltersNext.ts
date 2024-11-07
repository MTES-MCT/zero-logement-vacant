import { useMap } from 'react-use';

import { HousingFiltersDTO } from '@zerologementvacant/models';
import { useToggle } from './useToggle';

export interface UseFiltersOptions {
  initialFilters: HousingFiltersDTO;
}

export function useFilters(options: UseFiltersOptions) {
  const [filters, { setAll, remove, reset }] = useMap<HousingFiltersDTO>(
    options.initialFilters
  );
  const {
    active: expand,
    setActive: setExpand,
    toggle: toggleExpand
  } = useToggle(false);

  function setFilters(value: HousingFiltersDTO): void {
    setAll({
      ...filters,
      ...value
    });
  }

  function removeFilters(value: HousingFiltersDTO): void {
    Object.keys(value).forEach((key) => {
      remove(key as keyof HousingFiltersDTO);
    });
  }

  function resetFilters(): void {
    reset();
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
