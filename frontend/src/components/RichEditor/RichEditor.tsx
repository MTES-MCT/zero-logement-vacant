import { $generateHtmlFromNodes } from '@lexical/html';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import {
  InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { EditorState, LexicalEditor } from 'lexical';

import ToolbarPlugin from './ToolbarPlugin';
import './rich-editor.scss';
import theme from './rich-editor-theme';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

interface Props {
  onChange?(content: string): void;
}

function RichEditor(props: Props) {
  const config: InitialConfigType = {
    namespace: 'rich-editor',
    theme,
    onError(error: Error, editor: LexicalEditor) {
      console.error(error);
    },
  };

  function onChange(state: EditorState, editor: LexicalEditor): void {
    state.read(() => {
      const html = $generateHtmlFromNodes(editor, null);
      props.onChange?.(html);
    });
  }

  return (
    <LexicalComposer initialConfig={config}>
      <ToolbarPlugin className="fr-mb-2w" />
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <OnChangePlugin ignoreSelectionChange onChange={onChange} />
      <ClearEditorPlugin />
      <HistoryPlugin />
      <AutoFocusPlugin />
    </LexicalComposer>
  );
}

export default RichEditor;
