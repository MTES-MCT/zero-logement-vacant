import Input, { type InputProps } from '@codegouvfr/react-dsfr/Input';
import { identity, pipe } from 'effect';
import type {
  ChangeEventHandler,
  DetailedHTMLProps,
  LabelHTMLAttributes,
  ReactNode
} from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { match, Pattern } from 'ts-pattern';

export type AppTextInputNextProps<TFieldValues extends FieldValues = FieldValues, TValueType = string> = InputProps & {
  name: Path<TFieldValues>;
  control?: Control<TFieldValues>;
  // TODO: require these functions when TValueType is not a string
  mapValue?(value: TValueType): string;
  contramapValue?(value: string): TValueType | null;
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
 *
 * @example Type-safe usage with explicit control (best for direct children)
 * ```tsx
 * type FormValues = { title: string; description: string };
 * const form = useForm<FormValues>();
 *
 * <AppTextInputNext
 *   name="title"  // ✅ Autocompleted and type-checked
 *   control={form.control}
 *   label="Title"
 * />
 * ```
 *
 * @example Type-safe usage with FormProvider (for deeply nested components)
 * ```tsx
 * type FormValues = { title: string; description: string };
 *
 * <FormProvider {...form}>
 *   <AppTextInputNext<FormValues>
 *     name="title"  // ✅ Autocompleted and type-checked
 *     label="Title"
 *   />
 * </FormProvider>
 * ```
 */
function AppTextInputNext<TFieldValues extends FieldValues = FieldValues, TValueType = string>(
  props: AppTextInputNextProps<TFieldValues, TValueType>
) {
  const {
    nativeLabelProps,
    nativeInputProps,
    nativeTextAreaProps,
    mapValue,
    contramapValue,
    textArea,
    control,
    name,
    disabled,
    ...rest
  } = props;
  const { field, fieldState } = useController<TFieldValues>({
    name,
    control,
    disabled
  });

  const transform = {
    input: mapValue ?? identity,
    output: contramapValue ?? identity
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
      LabelHTMLAttributes<HTMLLabelElement>,
      HTMLLabelElement
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
      LabelHTMLAttributes<HTMLLabelElement>,
      HTMLLabelElement
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
