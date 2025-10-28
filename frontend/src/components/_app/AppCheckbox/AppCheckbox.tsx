import type { ChangeEventHandler, ReactNode } from 'react';
import Checkbox, { type CheckboxProps } from '@codegouvfr/react-dsfr/Checkbox';

interface Props<Value extends string> extends Omit<CheckboxProps, 'options'> {
  checked?: boolean;
  onChange?: ChangeEventHandler;
  value?: Value;
  label?: ReactNode;
}

function AppCheckbox<Value extends string = string>({
  checked,
  onChange,
  value,
  label,
  hintText,
  ...props
}: Props<Value>) {
  return (
    <Checkbox
      {...props}
      options={[
        {
          label,
          nativeInputProps: {
            onChange,
            checked,
            value
          },
          hintText
        }
      ]}
    />
  );
}

export default AppCheckbox;
