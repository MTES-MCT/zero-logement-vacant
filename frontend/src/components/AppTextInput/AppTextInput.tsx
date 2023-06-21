import React, { ComponentPropsWithoutRef } from 'react';
import { TextInput } from '@dataesr/react-dsfr';
import { ObjectShape } from 'yup/lib/object';
import { useForm } from '../../hooks/useForm';

type AppTextInputProps<T extends ObjectShape> = ComponentPropsWithoutRef<
  typeof TextInput
> & {
  inputForm: ReturnType<typeof useForm>;
  inputKey: keyof T;
  whenValid?: string;
};

function AppTextInput<T extends ObjectShape>(props: AppTextInputProps<T>) {
  const { inputKey, inputForm, whenValid, ...textInputProps } = props;

  return (
    <TextInput
      {...textInputProps}
      onBlur={() => inputForm.validateAt(String(inputKey))}
      messageType={inputForm.messageType(String(inputKey))}
      message={inputForm.message(String(inputKey), whenValid)}
    />
  );
}

export default AppTextInput;
