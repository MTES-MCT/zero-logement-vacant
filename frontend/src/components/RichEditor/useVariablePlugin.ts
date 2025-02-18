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
  LexicalNode,
} from 'lexical';
import { useEffect } from 'react';

import { $createVariableNode, VariableNode } from './nodes/VariableNode';
import { Variable } from './Variable';
import { $getNodeByKey } from 'lexical';

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
          const selectionNode = selection?.getNodes()[0];

          if (!isWhitespaceBefore(selectionNode ?? null)) {
            $insertNodes([$createTextNode(' ')]);
          }

          $insertNodes([node]);

          const after = node.getNextSibling();
          if (!isWhitespaceAfter(after)) {
            node.insertAfter($createTextNode(' '));
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR
      );
    }, [editor]);

    useEffect(() => {
      return editor.registerMutationListener(VariableNode, (nodes) => {
        editor.update(() => {
          nodes.forEach((mutation, nodeKey) => {
            const node = editor.getEditorState().read(() => $getNodeByKey(nodeKey));
            if (node instanceof VariableNode && !node.isAttached()) {
              cleanUpWhitespace(node);
            }
          });
        });
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
    return !node || ($isTextNode(node) && /\s$/.test(node.getTextContent()));
  }

  function isWhitespaceAfter(node: LexicalNode | null): boolean {
    return !node || ($isTextNode(node) && /^\s/.test(node.getTextContent()));
  }

  function cleanUpWhitespace(node: VariableNode) {
    const prev = node.getPreviousSibling();
    const next = node.getNextSibling();

    if ($isTextNode(prev) && $isTextNode(next)) {
      const prevText = prev.getTextContent().trimEnd();
      const nextText = next.getTextContent().trimStart();

      prev.setTextContent(`${prevText} ${nextText}`);
      next.remove();
    }

    if ($isTextNode(prev) && prev.getTextContent().trim() === '') {
      prev.remove();
    }

    if ($isTextNode(next) && next.getTextContent().trim() === '') {
      next.remove();
    }
  }
