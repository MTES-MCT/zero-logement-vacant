import { createStateContext } from 'react-use';

export interface HousingEditionContext {
  editing: boolean;
  tab: 'occupancy' | 'mobilization' | 'note';
}

const [useHousingEditionContext, HousingEditionProvider] =
  createStateContext<HousingEditionContext>({
    editing: false,
    tab: 'occupancy'
  });

export function useHousingEdition() {
  const [context, setHousingEditionContext] = useHousingEditionContext();

  const editing = context.editing;
  function setEditing(editing: boolean) {
    setHousingEditionContext((context) => ({
      ...context,
      editing
    }));
  }

  const tab = context.tab;
  function setTab(tab: HousingEditionContext['tab']) {
    setHousingEditionContext((context) => ({
      ...context,
      tab
    }));
  }

  return {
    editing,
    tab,
    setEditing,
    setTab
  };
}

export { HousingEditionProvider };
