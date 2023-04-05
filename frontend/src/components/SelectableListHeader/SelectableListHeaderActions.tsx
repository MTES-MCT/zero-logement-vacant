import { ReactNode } from 'react';

interface SelectableListHeaderActionsProps {
  children?: ReactNode | ReactNode[];
}

function SelectableListHeaderActions(props: SelectableListHeaderActionsProps) {
  return <>{props.children}</>;
}

export default SelectableListHeaderActions;
