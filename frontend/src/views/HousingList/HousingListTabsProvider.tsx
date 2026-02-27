import {
  HOUSING_STATUS_VALUES,
  toHousingStatusId
} from '@zerologementvacant/models';
import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useState
} from 'react';

import { getHousingState } from '../../models/HousingState';

interface ContextType {
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
}

const statuses = [
  { id: 'all', label: 'Tous', value: undefined },
  ...HOUSING_STATUS_VALUES.map((status) => {
    return {
      id: toHousingStatusId(status),
      label: getHousingState(status).title,
      value: status
    };
  })
];

const HousingListTabsContext = createContext<ContextType | null>(null);

function HousingListTabsProvider(props: PropsWithChildren) {
  const [activeTab, setActiveTab] = useState(statuses[0].id);

  const value: ContextType = {
    activeTab,
    setActiveTab
  };

  return (
    <HousingListTabsContext.Provider value={value}>
      {props.children}
    </HousingListTabsContext.Provider>
  );
}

export function useHousingListTabs() {
  const context = useContext(HousingListTabsContext);
  if (!context) {
    throw new Error(
      'useHousingListTabs must be used within a HousingListTabsProvider'
    );
  }

  const activeStatus =
    statuses.find((status) => status.id === context.activeTab) ?? statuses[0];

  return {
    ...context,
    activeStatus
  };
}

export default HousingListTabsProvider;
