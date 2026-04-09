import { fr } from '@codegouvfr/react-dsfr';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import classNames from 'classnames';
import { FORMAT_ELEMENT_COMMAND, FORMAT_TEXT_COMMAND } from 'lexical';

import IconToggle from '~/components/IconToggle/IconToggle';
import { useToolbarPlugin } from '~/components/RichEditor/useToolbarPlugin';
import { useVariablePlugin } from '~/components/RichEditor/useVariablePlugin';
import type { Variable } from '~/components/RichEditor/Variable';
import VariableSelect from '~/components/RichEditor/VariableSelect';

interface ToolbarPluginProps {
  className?: string;
  variableOptions: Variable[];
}

const ToolbarContainer = styled(Stack, {
  shouldForwardProp: (prop) => !['component'].includes(prop as string)
})({
  backgroundColor: fr.colors.decisions.background.alt.grey.default,
  justifyContent: 'space-between',
  padding: '1rem 1.5rem'
});

function ToolbarPlugin(props: Readonly<ToolbarPluginProps>) {
  const [editor] = useLexicalComposerContext();

  const toolbar = useToolbarPlugin({
    editor
  });
  const { insertVariable } = useVariablePlugin({
    editor
  });

  return (
    <ToolbarContainer
      className={classNames(props.className)}
      direction="row"
      spacing="1rem"
      useFlexGap
    >
      <Stack component="ul" direction="row" spacing="0.5rem" useFlexGap>
        <li>
          <IconToggle
            iconId="fr-icon-bold"
            isActive={toolbar.state.bold}
            title="Gras"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            }}
          />
        </li>
        <li>
          <IconToggle
            iconId="fr-icon-italic"
            isActive={toolbar.state.italic}
            title="Italique"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            }}
          />
        </li>
        <li>
          <IconToggle
            iconId="ri-underline"
            isActive={toolbar.state.underline}
            title="Souligner"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            }}
          />
        </li>
        <li>
          <IconToggle
            iconId="ri-align-left"
            isActive={toolbar.state.align === 'left'}
            title="Aligner à gauche"
            onClick={() => {
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
            }}
          />
        </li>
        <li>
          <IconToggle
            iconId="ri-align-center"
            isActive={toolbar.state.align === 'center'}
            title="Centrer"
            onClick={() => {
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
            }}
          />
        </li>
        <li>
          <IconToggle
            iconId="ri-align-right"
            isActive={toolbar.state.align === 'right'}
            title="Aligner à droite"
            onClick={() => {
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
            }}
          />
        </li>
        <li>
          <IconToggle
            iconId="ri-align-justify"
            isActive={toolbar.state.align === 'justify'}
            title="Justifier"
            onClick={() => {
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
            }}
          />
        </li>
        <li>
          <IconToggle
            iconId="fr-icon-list-unordered"
            title="Liste à puces"
            onClick={() => {
              editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            }}
          />
        </li>
        <li>
          <IconToggle
            iconId="fr-icon-list-ordered"
            title="Liste ordonnée"
            onClick={() => {
              editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            }}
          />
        </li>
      </Stack>
      <Stack direction="row">
        <VariableSelect
          options={props.variableOptions}
          onSelect={insertVariable}
        />
      </Stack>
    </ToolbarContainer>
  );
}

export default ToolbarPlugin;
