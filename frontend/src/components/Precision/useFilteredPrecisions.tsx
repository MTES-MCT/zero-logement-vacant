import type { Precision, PrecisionCategory } from '@zerologementvacant/models';

interface UseFilteredPrecisionsOptions {
  predicate(category: PrecisionCategory): boolean;
  showAll: boolean;
}

const DISPLAY_TAGS = 6;

export function useFilteredPrecisions(
  precisions: ReadonlyArray<Precision>,
  options: UseFilteredPrecisionsOptions
) {
  const { predicate, showAll } = options;
  const allItems = precisions.filter((precision) =>
    predicate(precision.category)
  );

  return {
    totalCount: allItems.length,
    filteredItems: allItems.slice(0, showAll ? allItems.length : DISPLAY_TAGS),
    remainingCount: Math.max(0, allItems.length - DISPLAY_TAGS)
  };
}
