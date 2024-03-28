import { $getSelection, $isRangeSelection, LexicalEditor } from 'lexical';
import { useCallback, useEffect, useState } from 'react';

export interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface Props {
  editor: LexicalEditor;
}

export function useToolbarPlugin(props: Props) {
  const { editor } = props;
  const [state, setState] = useState<ToolbarState>({
    bold: false,
    italic: false,
    underline: false,
  });

  const onSelectionChange = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      setState({
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        underline: selection.hasFormat('underline'),
      });
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener((update) => {
      const { editorState } = update;

      editorState.read(() => {
        onSelectionChange();
      });
    });
  }, [editor, onSelectionChange]);

  return {
    state,
    setState,
  };
}
