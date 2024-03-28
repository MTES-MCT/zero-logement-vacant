import {
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  LexicalEditor,
} from 'lexical';
import { useEffect } from 'react';

import { $createVariableNode } from './nodes/VariableNode';
import { Variable } from './Variable';

interface Props {
  editor: LexicalEditor;
}

export const INSERT_VARIABLE_COMMAND: LexicalCommand<Variable> =
  createCommand();

export function useVariablePlugin(props: Props) {
  const { editor } = props;

  useEffect(() => {
    return editor.registerCommand(
      INSERT_VARIABLE_COMMAND,
      (variable): boolean => {
        const selection = $getSelection();
        if (selection && $isNodeSelection(selection)) {
          return false;
        }

        const node = $createVariableNode(variable);
        $insertNodes([node]);

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  function insertVariable(variable: Variable): void {
    editor.dispatchCommand(INSERT_VARIABLE_COMMAND, variable);
  }

  return {
    insertVariable,
  };
}
