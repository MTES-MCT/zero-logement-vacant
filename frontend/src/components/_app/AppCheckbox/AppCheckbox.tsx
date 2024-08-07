import React, { ComponentPropsWithoutRef, ReactNode } from 'react';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';

interface CheckboxProps
  extends Partial<ComponentPropsWithoutRef<typeof Checkbox>> {
  checked?: boolean;
  onChange?: React.ChangeEventHandler;
  value?: string;
  label?: ReactNode;
  hintText?: string;
}

const AppCheckbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  value,
  label,
  hintText,
  ...props
}: CheckboxProps) => {
  return (
    <Checkbox
      {...props}
      options={[
        {
          label,
          nativeInputProps: {
            onChange,
            checked,
            value,
          },
          hintText,
        },
      ]}
    />
  );
};

export default AppCheckbox;
