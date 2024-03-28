import { $findMatchingParent } from '@lexical/utils';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  LexicalEditor,
} from 'lexical';
import fp from 'lodash/fp';
import { useCallback, useEffect, useState } from 'react';

import { isNotNull } from '../../utils/compareUtils';

export interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right' | 'justify' | '';
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
    align: '',
  });

  const onSelectionChange = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      const nodes = selection.getNodes().filter($isElementNode).length
        ? selection.getNodes().filter($isElementNode)
        : selection
            .getNodes()
            .map((node) => $findMatchingParent(node, $isElementNode));
      const formats = nodes
        .filter(isNotNull)
        .map((node) => node.getFormatType())
        .filter(isAlign);
      const isUnique = fp.uniq(formats).length === 1;

      setState({
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        underline: selection.hasFormat('underline'),
        align: isUnique ? formats[0] : '',
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

function isAlign(align: string): align is ToolbarState['align'] {
  return ['left', 'center', 'right', 'justify', ''].includes(align);
}
