import { ComponentPropsWithoutRef, InputHTMLAttributes } from 'react';
import { ObjectShape } from 'yup/lib/object';
import { useForm } from '../../../hooks/useForm';
import Select from '@codegouvfr/react-dsfr/Select';
import { SelectOptions } from '../../_dsfr/components/interface/Select/Select';

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
        ...selectProps,
      }}
      state={inputForm.messageType(String(inputKey))}
      stateRelatedMessage={inputForm.message(String(inputKey), whenValid)}
    >
      {options.map((option) => (
        <option
          label={option.label}
          value={option.value}
          disabled={option.disabled}
        ></option>
      ))}
    </Select>
  );
}

export default AppSelect;
