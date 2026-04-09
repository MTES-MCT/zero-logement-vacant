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

const ToolbarItem = styled('li')({
  listStyle: 'none',
  padding: 0
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
      <Stack
        component="ul"
        direction="row"
        spacing="0.5rem"
        useFlexGap
        sx={{ padding: 0, flexWrap: 'wrap' }}
      >
        <ToolbarItem>
          <IconToggle
            iconId="fr-icon-bold"
            isActive={toolbar.state.bold}
            title="Gras"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            }}
          />
        </ToolbarItem>
        <ToolbarItem>
          <IconToggle
            iconId="fr-icon-italic"
            isActive={toolbar.state.italic}
            title="Italique"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            }}
          />
        </ToolbarItem>
        <ToolbarItem>
          <IconToggle
            iconId="ri-underline"
            isActive={toolbar.state.underline}
            title="Souligner"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            }}
          />
        </ToolbarItem>
        <ToolbarItem>
          <IconToggle
            iconId="ri-align-left"
            isActive={toolbar.state.align === 'left'}
            title="Aligner à gauche"
            onClick={() => {
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
            }}
          />
        </ToolbarItem>
        <ToolbarItem>
          <IconToggle
            iconId="ri-align-center"
            isActive={toolbar.state.align === 'center'}
            title="Centrer"
            onClick={() => {
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
            }}
          />
        </ToolbarItem>
        <ToolbarItem>
          <IconToggle
            iconId="ri-align-right"
            isActive={toolbar.state.align === 'right'}
            title="Aligner à droite"
            onClick={() => {
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
            }}
          />
        </ToolbarItem>
        <ToolbarItem>
          <IconToggle
            iconId="ri-align-justify"
            isActive={toolbar.state.align === 'justify'}
            title="Justifier"
            onClick={() => {
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
            }}
          />
        </ToolbarItem>
        <ToolbarItem>
          <IconToggle
            iconId="fr-icon-list-unordered"
            title="Liste à puces"
            onClick={() => {
              editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            }}
          />
        </ToolbarItem>
        <ToolbarItem>
          <IconToggle
            iconId="fr-icon-list-ordered"
            title="Liste ordonnée"
            onClick={() => {
              editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            }}
          />
        </ToolbarItem>
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
