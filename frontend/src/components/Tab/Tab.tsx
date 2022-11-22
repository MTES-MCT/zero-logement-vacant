import { Tab as DSFRTab } from '@dataesr/react-dsfr'
import React, { ComponentPropsWithoutRef } from "react";

interface TabProps extends Omit<ComponentPropsWithoutRef<typeof DSFRTab>, 'activeTab' | 'index'> {
  label: string
}

const Tab: React.FC<TabProps> = (props) => {
  // @ts-ignore: required because DSFR Tab has properties 'activeTab' and 'index'
  // which come from the DSFR Tabs component state. This state is not accessible
  // to a child component.
  return <DSFRTab {...props} />
}

export default Tab
