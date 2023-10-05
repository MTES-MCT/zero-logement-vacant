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
  const { textArea, inputKey, inputForm, whenValid, ...textInputProps } = props;

  return (
    <>
      {textArea ? (
        <Input
          label={textInputProps.label ?? ''}
          textArea
          {...textInputProps}
          nativeTextAreaProps={{
            ...textInputProps,
            onBlur: () => inputForm.validateAt(String(inputKey)),
          }}
          state={inputForm.messageType(String(inputKey))}
          stateRelatedMessage={inputForm.message(String(inputKey), whenValid)}
        />
      ) : (
        <Input
          label={textInputProps.label ?? ''}
          {...textInputProps}
          nativeInputProps={{
            ...textInputProps,
            onBlur: () => inputForm.validateAt(String(inputKey)),
          }}
          state={inputForm.messageType(String(inputKey))}
          stateRelatedMessage={inputForm.message(String(inputKey), whenValid)}
        />
      )}
    </>
  );
}

export default AppTextInput;
