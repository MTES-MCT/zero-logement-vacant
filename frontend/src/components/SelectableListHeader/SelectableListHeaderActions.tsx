import { ReactNode } from 'react';

interface SelectableListHeaderActionsProps {
  children?: ReactNode | ReactNode[];
}

function SelectableListHeaderActions(props: SelectableListHeaderActionsProps) {
  if (props.children) {
    return <>{props.children}</>;
  }

  return <></>;
}

export default SelectableListHeaderActions;
