import { $generateHtmlFromNodes } from '@lexical/html';
import { ListNode, ListItemNode } from '@lexical/list';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import {
  InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { EditorState, LexicalEditor } from 'lexical';

import ToolbarPlugin from './ToolbarPlugin';
import './rich-editor.scss';
import theme from './rich-editor-theme';
import { VARIABLE_OPTIONS } from './variable-options';
import { VariableNode } from './nodes/VariableNode';
import RestorePlugin from './RestorePlugin';

interface Props {
  ariaLabelledBy?: string;
  content?: string;
  onChange?(content: string): void;
}

function RichEditor(props: Readonly<Props>) {
  const config: InitialConfigType = {
    namespace: 'rich-editor',
    theme,
    nodes: [ListNode, ListItemNode, VariableNode],
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

  if (!props.content) {
    return null;
  }

  return (
    <LexicalComposer initialConfig={config}>
      <ToolbarPlugin className="fr-mb-2w" variableOptions={VARIABLE_OPTIONS} />
      <RichTextPlugin
        contentEditable={
          <ContentEditable ariaLabelledBy={props.ariaLabelledBy} />
        }
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <OnChangePlugin ignoreSelectionChange onChange={onChange} />
      <ClearEditorPlugin />
      <HistoryPlugin />
      <AutoFocusPlugin />
      <ListPlugin />
      <RestorePlugin content={props.content} />
    </LexicalComposer>
  );
}

export default RichEditor;
