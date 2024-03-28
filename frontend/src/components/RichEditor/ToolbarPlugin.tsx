import { SelectProps } from '@codegouvfr/react-dsfr/SelectNext';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import classNames from 'classnames';
import { FORMAT_TEXT_COMMAND } from 'lexical';

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
          title="Sous-ligné"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
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
