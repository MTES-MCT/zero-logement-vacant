import { $generateHtmlFromNodes } from '@lexical/html';
import { ListItemNode, ListNode } from '@lexical/list';
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
import { $getRoot, EditorState, LexicalEditor } from 'lexical';

import ToolbarPlugin from './ToolbarPlugin';
import './rich-editor.scss';
import theme from './rich-editor-theme';
import { VARIABLE_OPTIONS } from './variable-options';
import { VariableNode } from './nodes/VariableNode';
import RestorePlugin from './RestorePlugin';
import { useForm } from '../../hooks/useForm';
import classNames from 'classnames';

interface Props {
  inputForm: ReturnType<typeof useForm>;
  inputKey: string;
  ariaLabelledBy?: string;
  content: string;
  onChange(content: string): void;
}

function RichEditor(props: Readonly<Props>) {
  const config: InitialConfigType = {
    namespace: 'rich-editor',
    theme,
    nodes: [ListNode, ListItemNode, VariableNode],
    onError(error: Error) {
      console.error(error);
    },
  };

  function onChange(state: EditorState, editor: LexicalEditor): void {
    state.read(() => {
      const html = $generateHtmlFromNodes(editor, null);
      const root = $getRoot();
      /*
      * The HTML length could be greater than 0 but still be considered empty,
      * for example, if it contains only non-content elements like <p><br /></p>.
      */
      const isEmpty = root?.getFirstChild()?.getTextContentSize() === 0;
      const content = !isEmpty ? html : '';
      props.onChange?.(content);
    });
  }

  const hasError = props.inputForm.messageType(props.inputKey) === 'error';

  return (
    <div className={classNames('fr-input-group', 'fr-col-12', { 'fr-input-group--error': hasError })}>
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
      { hasError &&
        <p className="fr-error-text">{props.inputForm.message(props.inputKey)}</p>
      }
    </div>
  );
}

export default RichEditor;
