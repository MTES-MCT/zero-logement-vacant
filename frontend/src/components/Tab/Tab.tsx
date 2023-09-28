import { Tab as DSFRTab } from '@dataesr/react-dsfr';
import React, { ComponentPropsWithoutRef } from 'react';

export interface TabProps
  extends Omit<
    ComponentPropsWithoutRef<typeof DSFRTab>,
    'activeTab' | 'index'
  > {
  label: string;
  index?: number;
  activeTab?: number;
}

const Tab: React.FC<TabProps> = (props) => {
  // Required because DSFR Tab has properties 'activeTab' and 'index'
  // which come from the DSFR Tabs component state. This state is not accessible
  // to a child component.
  return (
    <DSFRTab
      {...props}
      label={props.label}
      index={props.index as number}
      activeTab={props.activeTab as number}
    />
  );
};

export default Tab;
