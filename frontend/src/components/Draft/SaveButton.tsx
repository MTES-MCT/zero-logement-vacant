import Button from '@codegouvfr/react-dsfr/Button';
import { useEffect, useState } from 'react';

interface Props {
  className?: string;
  isLoading: boolean;
  isSuccess: boolean;
  onSave(): void;
}

function SaveButton(props: Props) {
  const [text, setText] = useState('Sauvegarder');

  useEffect(() => {
    if (props.isLoading) {
      setText('Sauvegarde en cours...');
      return;
    }

    if (props.isSuccess) {
      setText('Sauvegardé !');
      setTimeout(() => setText('Sauvegarder'), 2000);
    }
  }, [props.isLoading, props.isSuccess]);

  return (
    <Button
      className={props.className}
      disabled={props.isLoading}
      priority="secondary"
      type="button"
      onClick={props.onSave}
    >
      {text}
    </Button>
  );
}

export default SaveButton;
