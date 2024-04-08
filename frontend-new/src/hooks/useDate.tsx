import { useMemo, useState } from 'react';
import { format } from 'date-fns';

export function useDate(ref: Date = new Date()) {
  const [date, setDate] = useState(ref);

  const formatted: string = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);

  return {
    date,
    formatted,
    setDate,
  };
}
