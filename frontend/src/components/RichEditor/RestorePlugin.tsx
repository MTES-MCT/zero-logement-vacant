import { $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isRootTextContentEmpty } from '@lexical/text';
import { $getRoot } from 'lexical';
import { useEffect } from 'react';

interface Props {
  content: string;
}

function RestorePlugin(props: Props) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!props.content.length) {
      return;
    }

    return editor.update(() => {
      if (!$isRootTextContentEmpty(editor.isComposing(), true)) {
        return;
      }

      $getRoot().clear();

      const parser = new DOMParser();
      const dom = parser.parseFromString(props.content, 'text/html');

      const nodes = $generateNodesFromDOM(editor, dom);

      // Select the root
      const selection = $getRoot().select();

      // Insert them at a selection.
      selection.insertNodes(nodes);
    });
  }, [editor, props.content]);

  return null;
}

export default RestorePlugin;
