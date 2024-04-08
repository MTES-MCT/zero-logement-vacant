import { $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { useEffect, useState } from 'react';

interface Props {
  content: string;
}

function RestorePlugin(props: Props) {
  const [editor] = useLexicalComposerContext();
  const [state] = useState(props.content);

  useEffect(() => {
    return editor.update(() => {
      $getRoot().clear();

      const parser = new DOMParser();
      const dom = parser.parseFromString(state, 'text/html');

      const nodes = $generateNodesFromDOM(editor, dom);

      // Select the root
      const selection = $getRoot().select();

      // Insert them at a selection.
      selection.insertNodes(nodes);
    });
  }, [editor, state]);

  return null;
}

export default RestorePlugin;
