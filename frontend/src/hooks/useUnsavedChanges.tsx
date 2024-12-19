import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

interface Props {
  when: boolean;
  message?: string;
}

function useUnsavedChanges(props: Readonly<Props>) {
  const message =
    props.message ??
    'Voulez-vous vraiment quitter cette page ? Les modifications non enregistrées seront perdues.';

  const blocker = useBlocker(props.when);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(message)) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, message]);
}

export default useUnsavedChanges;
