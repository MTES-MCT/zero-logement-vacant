import type {
  ComponentPropsWithoutRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';
import type { ObjectShape } from 'yup';
import { useForm } from '../../../hooks/useForm';
import Input from '@codegouvfr/react-dsfr/Input';

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
    inputKey,
    inputForm,
    whenValid,
    placeholder,
    state,
    stateRelatedMessage,
    ...textInputProps
  } = props;

  return (
    <>
      {textArea ? (
        <Input
          label={textInputProps.label ?? ''}
          textArea
          {...textInputProps}
          nativeTextAreaProps={{
            ...textInputProps,
            placeholder,
            onBlur: () => inputForm.validateAt(String(inputKey))
          }}
          state={state ?? inputForm.messageType(String(inputKey))}
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
            onBlur: () => inputForm.validateAt(String(inputKey))
          }}
          state={state ?? inputForm.messageType(String(inputKey))}
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
