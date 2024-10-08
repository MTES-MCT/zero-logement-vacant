import { ChangeEvent } from 'react';
import { object, string } from 'yup';

import styles from './draft.module.scss';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { useForm } from '../../hooks/useForm';
import { DATE_REGEXP_OPTIONNAL } from '../../utils/dateUtils';
import Typography from '@mui/material/Typography';

export const writtenSchema = object({
  writtenAt: string().matches(
    DATE_REGEXP_OPTIONNAL,
    'Veuillez renseigner une date au format yyyy-mm-dd'
  ),
  writtenFrom: string()
});

export interface Written {
  at: string;
  from: string;
}

interface Props {
  form: ReturnType<typeof useForm>;
  writtenAt: string;
  writtenFrom: string;
  onChange(value: Written): void;
}

function DraftMailInfo(props: Readonly<Props>) {
  function onChange(key: keyof Written) {
    return (e: ChangeEvent<HTMLInputElement & HTMLTextAreaElement>): void => {
      props.onChange({
        at: props.writtenAt,
        from: props.writtenFrom,
        [key]: e.target.value
      });
    };
  }

  return (
    <article className={styles.article}>
      <Typography component="h4" variant="h6" mb={2}>
        Informations sur le courrier
      </Typography>
      <AppTextInput
        inputForm={props.form}
        inputKey="writtenAt"
        label="En date du ..."
        type="date"
        value={props.writtenAt}
        onChange={onChange('at')}
      />
      <AppTextInput
        inputForm={props.form}
        inputKey="writtenFrom"
        label="Écrit à ..."
        value={props.writtenFrom}
        onChange={onChange('from')}
      />
    </article>
  );
}

export default DraftMailInfo;
