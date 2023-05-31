import { SelectOption } from '../../models/SelectOption';
import { Checkbox } from '@dataesr/react-dsfr';
import { ReactNode } from 'react';

// @ts-ignore
export interface AppMultiSelectOptionProps
  extends Omit<SelectOption, 'markup'> {
  label: ReactNode;
  checked?: boolean;
  onChangeValue?: (value: string, isChecked: boolean) => void;
  size?: 'sm' | 'md';
}

function AppMultiSelectOption(props: AppMultiSelectOptionProps) {
  if (props.hidden) {
    return <></>;
  }

  return (
    <Checkbox
      checked={props.checked}
      disabled={props.disabled}
      // @ts-ignore
      label={props.label}
      onChange={(e) => props.onChangeValue?.(props.value, e.target.checked)}
      size={props.size ?? 'sm'}
      value={props.value}
    />
  );
}

export default AppMultiSelectOption;
