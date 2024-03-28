import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FORMAT_TEXT_COMMAND } from 'lexical';

import { useToolbarPlugin } from './useToolbarPlugin';
import { Container } from '../_dsfr';
import IconToggle from '../IconToggle/IconToggle';
import styles from './toolbar.module.scss';
import classNames from 'classnames';

interface Props {
  className?: string;
}

function ToolbarPlugin(props: Props) {
  const [editor] = useLexicalComposerContext();

  const toolbar = useToolbarPlugin({
    editor,
  });

  return (
    <Container
      as="section"
      className={classNames(styles.toolbar, props.className)}
      fluid
    >
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
    </Container>
  );
}

export default ToolbarPlugin;
