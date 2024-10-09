import { SelectOption } from '../../../models/SelectOption';
import { ChangeEvent, ReactNode } from 'react';
import AppCheckbox from '../AppCheckbox/AppCheckbox';

export interface AppMultiSelectOptionProps<Value extends string>
  extends Omit<SelectOption<Value>, 'label' | 'markup'> {
  label: ReactNode;
  checked?: boolean;
  onChangeValue?(value: Value, isChecked: boolean): void;
  small?: boolean;
}

function AppMultiSelectOption<Value extends string = string>(
  props: AppMultiSelectOptionProps<Value>
) {
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
