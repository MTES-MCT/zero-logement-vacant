import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import { ReactNode } from 'react';
import { useController } from 'react-hook-form';
import { match, Pattern } from 'ts-pattern';

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
      stateRelatedMessage={
        fieldState.invalid
          ? match(fieldState.error?.types)
              .returnType<ReactNode>()
              .with(undefined, () => fieldState.error?.message)
              .otherwise((errors) =>
                Object.values(errors)
                  .map((error) =>
                    match(error)
                      .returnType<ReactNode>()
                      .with(Pattern.string, (value) => value)
                      .with(Pattern.array(Pattern.string), (values) =>
                        values.join(', ')
                      )
                      .otherwise(() => null)
                  )
                  .join(' ')
              )
          : undefined
      }
    />
  );
}

export default AppTextInputNext;
