import { useMemo, useState } from 'react';

export interface Selection {
  all: boolean;
  ids: string[];
}

export function useSelection(itemCount: number) {
  const [selected, setSelected] = useState<Selection>({
    all: false,
    ids: [],
  });

  const hasSelected = useMemo<boolean>(
    () =>
      (selected.all && selected.ids.length < itemCount) ||
      (!selected.all && selected.ids.length > 0),
    [selected.all, selected.ids, itemCount]
  );

  const selectedCount = useMemo<number>(
    () =>
      selected.all ? itemCount - selected.ids.length : selected.ids.length,
    [selected.all, selected.ids, itemCount]
  );

  function select(id: string): void {
    setSelected((state) => ({
      ...state,
      ids: [...state.ids, id],
    }));
  }

  function toggleSelect(id: string): void {
    setSelected((state) => ({
      ...state,
      ids: state.ids.includes(id)
        ? state.ids.filter((_) => _ !== id)
        : [...state.ids, id],
    }));
  }

  function toggleSelectAll(forceValue?: boolean): void {
    setSelected((state) => {
      return {
        all:
          forceValue !== undefined
            ? forceValue
            : state.ids.length > 0 && state.all
            ? state.all
            : !state.all,
        ids: [],
      };
    });
  }

  function unselect(id: string): void {
    setSelected((state) => ({
      ...state,
      ids: state.ids.filter((stateId) => stateId !== id),
    }));
  }

  function isSelected(id: string): boolean {
    return (
      (selected.all && !selected.ids.includes(id)) ||
      (!selected.all && selected.ids.includes(id))
    );
  }

  return {
    hasSelected,
    selectedCount,
    isSelected,
    select,
    selected,
    setSelected,
    toggleSelect,
    toggleSelectAll,
    unselect,
  };
}
