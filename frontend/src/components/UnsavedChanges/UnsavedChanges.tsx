import { Prompt } from 'react-router-dom';

interface Props {
  when: boolean;
  message?: string;
}

function UnsavedChanges(props: Props) {
  const message =
    props.message ??
    'Voulez-vous vraiment quitter cette page ? Les modifications non enregistrées seront perdues.';

  return <Prompt when={props.when} message={message} />;
}

export default UnsavedChanges;
