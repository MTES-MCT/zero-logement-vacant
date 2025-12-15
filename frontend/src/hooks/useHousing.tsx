import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { assert } from 'ts-essentials';

import type { Housing } from '~/models/Housing';
import { useGetHousingQuery } from '~/services/housing.service';

interface HousingContextValue {
  housing: Housing | undefined;
  housingId: string;
  getHousingQuery: Omit<ReturnType<typeof useGetHousingQuery>, 'data'>;
}

const HousingContext = createContext<HousingContextValue | null>(null);

interface HousingProviderProps {
  housingId: string;
  children: ReactNode;
}

export function HousingProvider(props: Readonly<HousingProviderProps>) {
  const { data: housing, ...getHousingQuery } = useGetHousingQuery(
    props.housingId
  );

  const value = useMemo(() => ({
    housing,
    housingId: props.housingId,
    getHousingQuery
  }), [housing, props.housingId, getHousingQuery]);

  return (
    <HousingContext.Provider value={value}>
      {props.children}
    </HousingContext.Provider>
  );
}

export function useHousing() {
  const context = useContext(HousingContext);
  assert(context !== null, 'useHousing must be used within HousingProvider');
  return context;
}
