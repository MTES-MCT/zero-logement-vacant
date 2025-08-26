import Typography from '@mui/material/Typography';
import { object, string } from 'yup-next';

import { DATE_REGEXP_OPTIONNAL } from '../../utils/dateUtils';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import styles from './draft.module.scss';

export const writtenSchema = object({
  writtenAt: string()
    .trim()
    .matches(
      DATE_REGEXP_OPTIONNAL,
      'Veuillez renseigner une date au format yyyy-mm-dd'
    )
    .defined()
    .nullable()
    .default(null),
  writtenFrom: string().trim().defined().nullable().default(null)
});

function DraftMailInfo() {
  return (
    <article className={styles.article}>
      <Typography component="h4" variant="h6" mb={2}>
        Informations sur le courrier
      </Typography>
      <AppTextInputNext
        name="writtenAt"
        label="En date du ..."
        nativeInputProps={{
          type: 'date'
        }}
      />
      <AppTextInputNext name="writtenFrom" label="Écrit à ..." />
    </article>
  );
}

export default DraftMailInfo;
