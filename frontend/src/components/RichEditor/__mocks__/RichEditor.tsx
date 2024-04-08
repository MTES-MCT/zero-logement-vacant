import { ComponentPropsWithoutRef } from 'react';
import { object } from 'yup';

import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { useForm } from '../../../hooks/useForm';
import RichEditor from '../RichEditor';

type MockRichEditorProps = ComponentPropsWithoutRef<typeof RichEditor>;

function RichEditorMock(props: MockRichEditorProps) {
  const form = useForm(object(), {});

  return (
    <AppTextInput
      aria-labelledby={props.ariaLabelledBy}
      inputForm={form}
      inputKey="body"
      value={props.content}
      onChange={(event) => props.onChange(event.target.value)}
    />
  );
}

export default RichEditorMock;
