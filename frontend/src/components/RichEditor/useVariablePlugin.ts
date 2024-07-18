import {
  $createTextNode,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  LexicalEditor,
  LexicalNode
} from 'lexical';
import { useEffect } from 'react';

import { $createVariableNode, VariableNode } from './nodes/VariableNode';
import { Variable } from './Variable';

interface Props {
  editor: LexicalEditor;
}

export const INSERT_VARIABLE_COMMAND: LexicalCommand<Variable> =
  createCommand();

export function useVariablePlugin(props: Props) {
  const { editor, } = props;

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

  useEffect(() => {
    return editor.registerNodeTransform(VariableNode, (node) => {
      const before = node.getPreviousSibling();

      if (!isWhitespaceBefore(before)) {
        node.insertBefore($createTextNode(' '));
      }

      const after = node.getNextSibling();
      if (!isWhitespaceAfter(after)) {
        node.insertAfter($createTextNode(' '));
      }
    });
  }, [editor]);

  function insertVariable(variable: Variable): void {
    editor.dispatchCommand(INSERT_VARIABLE_COMMAND, variable);
  }

  return {
    insertVariable,
  };
}

function isWhitespaceBefore(node: LexicalNode | null): boolean {
  return $isTextNode(node) && node.getTextContent().endsWith(' ');
}

function isWhitespaceAfter(node: LexicalNode | null): boolean {
  return $isTextNode(node) && node.getTextContent().startsWith(' ');
}
