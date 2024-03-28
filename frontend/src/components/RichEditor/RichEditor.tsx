import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import {
  InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalEditor } from 'lexical';

import ToolbarPlugin from './ToolbarPlugin';
import './rich-editor.scss';
import theme from './rich-editor-theme';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';

interface Props {}

function RichEditor(props: Props) {
  const config: InitialConfigType = {
    namespace: 'rich-editor',
    theme,
    onError(error: Error, editor: LexicalEditor) {
      console.error(error);
    },
  };

  return (
    <LexicalComposer initialConfig={config}>
      <ToolbarPlugin className="fr-mb-2w" />
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <ClearEditorPlugin />
      <HistoryPlugin />
      <AutoFocusPlugin />
    </LexicalComposer>
  );
}

export default RichEditor;
