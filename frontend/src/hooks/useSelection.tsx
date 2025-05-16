import { useMemo, useState } from 'react';
import housingSlice from '../store/reducers/housingReducer';
import { useAppDispatch, useAppSelector } from './useStore';

export interface Selection {
  all: boolean;
  ids: string[];
}

export interface UseSelectionOptions {
  /**
   * @default 'state'
   */
  storage?: 'store' | 'state';
}

export function useSelection(
  itemCount: number = 0,
  options?: UseSelectionOptions
) {
  const storage = options?.storage ?? 'state';
  const store = useAppSelector((state) => state.housing);
  const dispatch = useAppDispatch();

  function changeSelected(selection: Selection) {
    dispatch(housingSlice.actions.setSelected(selection));
  }

  const state = useState<Selection>({
    all: false,
    ids: []
  });
  const [selected, setSelected] =
    storage === 'store' ? [store.selected, changeSelected] : state;

  const hasSelected = useMemo<boolean>(
    () =>
      (selected.all && selected.ids.length < itemCount) ||
      (!selected.all && selected.ids.length > 0),
    [selected.all, selected.ids, itemCount]
  );

  const hasSelectedAll = useMemo<boolean>(
    () => selected.all && selected.ids.length === 0,
    [selected.all, selected.ids]
  );

  const selectedCount = useMemo<number>(
    () =>
      selected.all ? itemCount - selected.ids.length : selected.ids.length,
    [selected.all, selected.ids, itemCount]
  );

  function select(id: string): void {
    setSelected({
      all: selected.all,
      ids: [...selected.ids, id]
    });
  }

  function toggleSelect(id: string): void {
    setSelected({
      all: selected.all,
      ids: selected.ids.includes(id)
        ? selected.ids.filter((_) => _ !== id)
        : [...selected.ids, id]
    });
  }

  function toggleSelectAll(forceValue?: boolean): void {
    setSelected({
      all:
        forceValue !== undefined
          ? forceValue
          : selected.ids.length > 0 && selected.all
            ? selected.all
            : !selected.all,
      ids: []
    });
  }

  function unselect(id: string): void {
    setSelected({
      all: selected.all,
      ids: selected.ids.filter((stateId) => stateId !== id)
    });
  }

  function unselectAll(): void {
    setSelected({
      all: false,
      ids: []
    });
  }

  function isSelected(id: string): boolean {
    return (
      (selected.all && !selected.ids.includes(id)) ||
      (!selected.all && selected.ids.includes(id))
    );
  }

  return {
    hasSelected,
    hasSelectedAll,
    selectedCount,
    isSelected,
    select,
    selected,
    setSelected,
    toggleSelect,
    toggleSelectAll,
    unselect,
    unselectAll
  };
}
