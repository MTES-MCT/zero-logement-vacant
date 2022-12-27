import { useMemo, useState } from 'react';

export interface Selection {
  all: boolean;
  ids: string[];
}

export function useSelection() {
  const [selected, setSelected] = useState<Selection>({
    all: false,
    ids: [],
  });

  const hasSelected = useMemo<boolean>(
    () => selected.all || selected.ids.length > 0,
    [selected.all, selected.ids]
  );

  return {
    hasSelected,
    selected,
    setSelected,
  };
}
