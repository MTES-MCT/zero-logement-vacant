import { SelectProps } from '@codegouvfr/react-dsfr/SelectNext';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import classNames from 'classnames';
import { FORMAT_ELEMENT_COMMAND, FORMAT_TEXT_COMMAND } from 'lexical';

import { useToolbarPlugin } from './useToolbarPlugin';
import { Container } from '../_dsfr';
import IconToggle from '../IconToggle/IconToggle';
import styles from './toolbar.module.scss';
import VariableSelect from './VariableSelect';
import { useVariablePlugin } from './useVariablePlugin';

interface Props {
  className?: string;
  variableOptions: SelectProps.Option[];
}

function ToolbarPlugin(props: Props) {
  const [editor] = useLexicalComposerContext();

  const toolbar = useToolbarPlugin({
    editor,
  });
  const { insertVariable } = useVariablePlugin({
    editor,
  });

  return (
    <Container
      as="header"
      className={classNames(styles.toolbar, props.className)}
      fluid
    >
      <section>
        <IconToggle
          iconId="fr-icon-bold"
          isActive={toolbar.state.bold}
          title="Gras"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
          }}
        />
        <IconToggle
          iconId="fr-icon-italic"
          isActive={toolbar.state.italic}
          title="Italique"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
          }}
        />
        <IconToggle
          iconId="ri-underline"
          isActive={toolbar.state.underline}
          title="Souligner"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
          }}
        />
        <IconToggle
          iconId="ri-align-left"
          isActive={toolbar.state.align === 'left'}
          title="Aligner à gauche"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
          }}
        />
        <IconToggle
          iconId="ri-align-center"
          isActive={toolbar.state.align === 'center'}
          title="Centrer"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
          }}
        />
        <IconToggle
          iconId="ri-align-right"
          isActive={toolbar.state.align === 'right'}
          title="Aligner à droite"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
          }}
        />
        <IconToggle
          iconId="ri-align-justify"
          isActive={toolbar.state.align === 'justify'}
          title="Justifier"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
          }}
        />
        <IconToggle
          iconId="fr-icon-list-unordered"
          title="Liste à puces"
          onClick={() => {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          }}
        />
        <IconToggle
          iconId="fr-icon-list-ordered"
          title="Liste ordonnée"
          onClick={() => {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          }}
        />
      </section>
      <section className={styles.toolbar__right}>
        <VariableSelect
          options={props.variableOptions}
          onSelect={insertVariable}
        />
      </section>
    </Container>
  );
}

export default ToolbarPlugin;
