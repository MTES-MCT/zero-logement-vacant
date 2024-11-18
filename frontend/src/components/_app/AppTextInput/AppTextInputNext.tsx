import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import { useController } from 'react-hook-form';

export type AppTextInputNextProps = InputProps & {
  name: string;
};

/**
 * A text input to be used with react-hook-form and validated using yup.
 */
function AppTextInputNext(props: AppTextInputNextProps) {
  const { field, fieldState } = useController({
    name: props.name,
    disabled: props.disabled
  });

  const isTextArea = props.textArea === true;

  return (
    <Input
      {...props}
      textArea={isTextArea}
      nativeInputProps={
        !isTextArea
          ? {
              ...props.nativeInputProps,
              // Avoid browser validation which prevents react-hook-form to work
              formNoValidate: true,
              name: field.name,
              ref: field.ref,
              value: field.value,
              onBlur: field.onBlur,
              onChange: field.onChange
            }
          : undefined
      }
      nativeTextAreaProps={
        isTextArea
          ? {
              ...props.nativeTextAreaProps,
              formNoValidate: true,
              name: field.name,
              ref: field.ref,
              value: field.value,
              onBlur: field.onBlur,
              onChange: field.onChange
            }
          : undefined
      }
      state={fieldState.invalid ? 'error' : undefined}
      stateRelatedMessage={fieldState.error?.message}
    />
  );
}

export default AppTextInputNext;
