import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { useForm } from '../../hooks/useForm';
import styles from './draft.module.scss';

interface Props {
  form: ReturnType<typeof useForm>;
  value?: string;
  onChangeValue?(value: string): void;
}

function DraftBody(props: Props) {
  return (
    <article className={styles.article}>
      <h6>Contenu de votre courrier</h6>
      <AppTextInput
        inputForm={props.form}
        inputKey="body"
        rows={6}
        state={props.form.hasError('body') ? 'error' : 'default'}
        textArea
        value={props.value}
        onChange={(e) => props.onChangeValue?.(e.target.value)}
      />
    </article>
  );
}

export default DraftBody;
