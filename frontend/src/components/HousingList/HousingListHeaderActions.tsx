import { ReactNode } from 'react';

interface HousingListHeaderActionsProps {
  children?: ReactNode | ReactNode[];
}

function HousingListHeaderActions(props: HousingListHeaderActionsProps) {
  if (props.children) {
    return <>{props.children}</>;
  }

  return <></>;
}

export default HousingListHeaderActions;
