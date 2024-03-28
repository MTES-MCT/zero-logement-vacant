import { ChangeEvent } from 'react';

import { useForm } from '../../hooks/useForm';
import styles from './draft.module.scss';
import RichEditor from '../RichEditor/RichEditor';

interface Props {
  form: ReturnType<typeof useForm>;
  value: string;
  onChange(value: string): void;
}

function DraftBody(props: Props) {
  function onChange(
    e: ChangeEvent<HTMLInputElement & HTMLTextAreaElement>
  ): void {
    props.onChange(e.target.value);
  }

  return (
    <article className={styles.article}>
      <h6 id="draft-body-label">Contenu de votre courrier</h6>
      <RichEditor />
    </article>
  );
}

export default DraftBody;
