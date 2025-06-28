import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import { identity, pipe } from 'effect';
import {
  ChangeEventHandler,
  type DetailedHTMLProps,
  type LabelHTMLAttributes,
  ReactNode,
  type TextareaHTMLAttributes
} from 'react';
import { useController } from 'react-hook-form';
import { match, Pattern } from 'ts-pattern';

export type AppTextInputNextProps<T> = InputProps & {
  name: string;
  // TODO: require these functions when T is not a string
  mapValue?(value: T): string;
  contramapValue?(value: string): T;
};
/**
 * A text input based on the [DSFR Input](https://components.react-dsfr.codegouv.studio/?path=/docs/components-input--default) component and [react-hook-form](https://react-hook-form.com/).
 * It supports both regular inputs and text areas.
 *
 * Note: if you want to use this component without react-hook-form,
 * use the DSFR `Input` component directly.
 *
 * @example Text area mode
 * ```tsx
 * <AppTextInputNext
 *   label="Nouvelle note"
 *   name="note"
 *   nativeTextAreaProps={{
 *     rows: 4
 *   }}
 *   textArea
 * />
 * ```
 */
function AppTextInputNext<T>(props: AppTextInputNextProps<T>) {
  const {
    nativeLabelProps,
    nativeInputProps,
    nativeTextAreaProps,
    textArea,
    ...rest
  } = props;
  const { field, fieldState } = useController({
    name: props.name,
    disabled: props.disabled
  });

  const transform = {
    input: props.mapValue ?? identity,
    output: props.contramapValue ?? identity
  };
  const value: string = transform.input(field.value);
  const onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (
    event
  ) => pipe(event.target.value, transform.output, field.onChange);

  const regularInputProps: Pick<
    InputProps.RegularInput,
    'nativeLabelProps' | 'nativeInputProps'
  > = {
    nativeLabelProps: nativeLabelProps as DetailedHTMLProps<
      LabelHTMLAttributes<HTMLInputElement>,
      HTMLInputElement
    >,
    nativeInputProps: {
      ...nativeInputProps,
      // Avoid browser validation which prevents react-hook-form to work
      formNoValidate: true,
      name: field.name,
      ref: field.ref,
      value: value,
      onBlur: field.onBlur,
      onChange: onChange
    }
  };
  const textAreaProps: Pick<
    InputProps.TextArea,
    'nativeLabelProps' | 'nativeTextAreaProps' | 'textArea'
  > = {
    textArea: true,
    nativeLabelProps: nativeLabelProps as DetailedHTMLProps<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      HTMLTextAreaElement
    >,
    nativeTextAreaProps: {
      ...nativeTextAreaProps,
      name: field.name,
      ref: field.ref,
      value: value,
      onBlur: field.onBlur,
      onChange: onChange
    }
  };

  return (
    <Input
      {...rest}
      {...(textArea ? textAreaProps : regularInputProps)}
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
