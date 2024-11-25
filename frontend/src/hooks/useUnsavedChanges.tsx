import { useBlocker } from 'react-router-dom';

interface Props {
  when: boolean;
  message?: string;
}

function useUnsavedChanges(props: Readonly<Props>) {
  const message =
    props.message ??
    'Voulez-vous vraiment quitter cette page ? Les modifications non enregistrées seront perdues.';

  useBlocker(() => {
    if (props.when) {
      return !window.confirm(message);
    }

    return true;
  });
}

export default useUnsavedChanges;
