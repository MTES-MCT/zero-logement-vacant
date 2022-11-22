import { TextInput as DSFRTextInput } from '@dataesr/react-dsfr'
import React, { ComponentPropsWithRef } from 'react';

interface TextFieldProps extends ComponentPropsWithRef<typeof DSFRTextInput> {
  textarea?: false
}

interface TextareaProps extends ComponentPropsWithRef<typeof DSFRTextInput> {
  textarea: true
  rows: string | number
}

type TextInputProps = TextFieldProps | TextareaProps

const TextInput: React.FC<TextInputProps> = (props) => {
  return <DSFRTextInput {...props} />
}

export default TextInput
