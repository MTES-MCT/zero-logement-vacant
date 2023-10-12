import { SelectOption } from '../../../models/SelectOption';
import { ChangeEvent, ReactNode } from 'react';
import AppCheckbox from '../AppCheckbox/AppCheckbox';

// @ts-ignore
export interface AppMultiSelectOptionProps
  extends Omit<SelectOption, 'markup'> {
  label: ReactNode;
  checked?: boolean;
  onChangeValue?: (value: string, isChecked: boolean) => void;
  small?: boolean;
}

function AppMultiSelectOption(props: AppMultiSelectOptionProps) {
  if (props.hidden) {
    return <></>;
  }

  return (
    <AppCheckbox
      checked={props.checked}
      disabled={props.disabled}
      label={props.label}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        props.onChangeValue?.(props.value, e.target.checked)
      }
      small={props.small}
      value={props.value}
    />
  );
}

export default AppMultiSelectOption;
