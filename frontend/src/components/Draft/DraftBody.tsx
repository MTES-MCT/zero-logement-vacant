import { useForm } from '../../hooks/useForm';
import styles from './draft.module.scss';
import RichEditor from '../RichEditor/RichEditor';

interface Props {
  form: ReturnType<typeof useForm>;
  value: string;
  onChange(value: string): void;
}

function DraftBody(props: Props) {
  return (
    <article className={styles.article}>
      <h6 id="draft-body-label">Contenu de votre courrier</h6>
      <RichEditor content={props.value} onChange={props.onChange} />
    </article>
  );
}

export default DraftBody;
