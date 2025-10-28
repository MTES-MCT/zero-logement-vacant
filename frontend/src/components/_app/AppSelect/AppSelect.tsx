import type { ComponentPropsWithoutRef, InputHTMLAttributes } from 'react';
import type { ObjectShape } from 'yup/lib/object';
import { useForm } from '../../../hooks/useForm';
import Select from '@codegouvfr/react-dsfr/Select';
import type { SelectOptions } from '../../_dsfr/components/interface/Select/Select';

type AppSelectProps<T extends ObjectShape> = Partial<
  Pick<ComponentPropsWithoutRef<typeof Select>, 'label'>
> &
  InputHTMLAttributes<HTMLSelectElement> & {
    options: SelectOptions[];
    inputForm: ReturnType<typeof useForm>;
    inputKey: keyof T;
    whenValid?: string;
  };

function AppSelect<T extends ObjectShape>(props: AppSelectProps<T>) {
  const { options, inputKey, inputForm, whenValid, ...selectProps } = props;

  return (
    <Select
      {...selectProps}
      label={selectProps.label}
      nativeSelectProps={{
        ...selectProps
      }}
      state={inputForm.messageType(String(inputKey))}
      stateRelatedMessage={inputForm.message(String(inputKey), whenValid)}
    >
      {options.map((option) => (
        <option
          disabled={option.disabled}
          label={option.label}
          key={option.value}
          value={option.value}
        ></option>
      ))}
    </Select>
  );
}

export default AppSelect;
