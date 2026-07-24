import Input from '@codegouvfr/react-dsfr/Input';
import type {
  ComponentPropsWithoutRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';

import { type ObjectShape, useForm } from '../../../hooks/useForm';

type AppTextInputProps<T extends ObjectShape> = Partial<
  Pick<
    ComponentPropsWithoutRef<typeof Input>,
    'label' | 'textArea' | 'hintText' | 'state' | 'stateRelatedMessage'
  >
> &
  InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    inputForm: ReturnType<typeof useForm>;
    inputKey: keyof T;
    whenValid?: string;
    dataTestId?: string;
  };

/**
 * @deprecated See {@link AppTextInputNext}
 * @param props
 * @constructor
 */
function AppTextInput<T extends ObjectShape>(props: AppTextInputProps<T>) {
  const {
    textArea,
    hintText,
    inputKey,
    inputForm,
    whenValid,
    placeholder,
    state,
    stateRelatedMessage,
    ...textInputProps
  } = props;

  const resolvedState = state ?? inputForm.messageType(String(inputKey));
  const isInvalid = resolvedState === 'error';

  return (
    <>
      {textArea ? (
        <Input
          label={textInputProps.label ?? ''}
          textArea
          hintText={hintText}
          {...textInputProps}
          nativeTextAreaProps={{
            ...textInputProps,
            placeholder,
            onBlur: () => inputForm.validateAt(String(inputKey)),
            'aria-invalid': isInvalid ? 'true' : undefined
          }}
          state={resolvedState}
          stateRelatedMessage={
            stateRelatedMessage ??
            inputForm.message(String(inputKey), whenValid)
          }
        />
      ) : (
        <Input
          label={textInputProps.label ?? ''}
          {...textInputProps}
          nativeInputProps={{
            ...textInputProps,
            placeholder,
            onBlur: () => inputForm.validateAt(String(inputKey)),
            'aria-invalid': isInvalid ? 'true' : undefined
          }}
          state={resolvedState}
          stateRelatedMessage={
            stateRelatedMessage ??
            inputForm.message(String(inputKey), whenValid)
          }
        />
      )}
    </>
  );
}

export default AppTextInput;
