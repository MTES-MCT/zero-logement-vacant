import { createContext, useContext, type ReactNode } from 'react';
import { assert } from 'ts-essentials';

import type { Housing } from '~/models/Housing';

interface HousingContextValue {
  housing: Housing | null;
  error: string | null;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
}

const HousingContext = createContext<HousingContextValue | null>(null);

interface HousingProviderProps extends HousingContextValue {
  children: ReactNode;
}

export function HousingProvider(props: Readonly<HousingProviderProps>) {
  const { children, ...rest } = props;
  return (
    <HousingContext.Provider value={rest}>{children}</HousingContext.Provider>
  );
}

export function useHousing() {
  const context = useContext(HousingContext);
  assert(context !== null, 'useHousing must be used within HousingProvider');
  return context;
}
