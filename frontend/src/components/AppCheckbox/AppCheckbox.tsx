import React, { ComponentPropsWithoutRef, ReactNode } from 'react';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';

interface CheckboxProps
  extends Partial<ComponentPropsWithoutRef<typeof Checkbox>> {
  checked?: boolean;
  onChange?: React.ChangeEventHandler;
  value?: string;
  label?: ReactNode;
}

const AppCheckbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  value,
  label,
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
        },
      ]}
    />
  );
};

export default AppCheckbox;
