import React, {
  ComponentPropsWithoutRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { ObjectShape } from 'yup/lib/object';
import { useForm } from '../../hooks/useForm';
import Input from '@codegouvfr/react-dsfr/Input';

type AppTextInputProps<T extends ObjectShape> = Partial<
  Pick<
    ComponentPropsWithoutRef<typeof Input>,
    'label' | 'textArea' | 'hintText'
  >
> &
  InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    inputForm: ReturnType<typeof useForm>;
    inputKey: keyof T;
    whenValid?: string;
  };

function AppTextInput<T extends ObjectShape>(props: AppTextInputProps<T>) {
  const { inputKey, inputForm, whenValid, ...textInputProps } = props;

  return (
    // @ts-ignore
    <Input
      {...textInputProps}
      nativeInputProps={
        textInputProps.textArea
          ? {}
          : {
              ...textInputProps,
              onBlur: (event: any) => inputForm.validateAt(String(inputKey)),
            }
      }
      nativeTextAreaProps={
        textInputProps.textArea
          ? {
              ...textInputProps,
              onBlur: (event: any) => inputForm.validateAt(String(inputKey)),
            }
          : {}
      }
      state={inputForm.messageType(String(inputKey))}
      stateRelatedMessage={inputForm.message(String(inputKey), whenValid)}
    />
  );
}

export default AppTextInput;
