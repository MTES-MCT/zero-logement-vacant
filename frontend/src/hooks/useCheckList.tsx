import { useEffect, useState } from 'react';

export interface CheckedItems {
  all: boolean;
  ids: string[];
}

export function useCheckList<T>(
  list: T[] | undefined,
  onSelectItem?: (selectedItem: CheckedItems) => void
) {
  // Contains unchecked elements if "allChecked" is true
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [allChecked, setAllChecked] = useState<boolean>(false);

  const checkAll = (checked: boolean) => {
    const checkedItems = { all: checked, ids: [] };
    setAllChecked(checkedItems.all);
    setCheckedIds(checkedItems.ids);
    onSelectItem?.(checkedItems);
  };

  const checkOne = (id: string) => {
    const updatedCheckIds =
      checkedIds.indexOf(id) === -1
        ? [...checkedIds, id]
        : checkedIds.filter((f) => f !== id);
    setCheckedIds(updatedCheckIds);
    onSelectItem?.({ all: allChecked, ids: updatedCheckIds });
  };

  const unselectAll = () => {
    setAllChecked(false);
    setCheckedIds([]);
    onSelectItem?.({ all: false, ids: [] });
  };

  useEffect(() => {
    setAllChecked(false);
    setCheckedIds([]);
    onSelectItem?.({ all: false, ids: [] });
  }, [list]); //eslint-disable-line react-hooks/exhaustive-deps

  return {
    checkAll,
    checkOne,
    unselectAll,
    checkedIds,
    allChecked,
  };
}
