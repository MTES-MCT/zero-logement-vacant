import Typography from '@mui/material/Typography';
import { useFormContext } from 'react-hook-form';
import { object, string, type InferType } from 'yup-next';

import { DATE_REGEXP_OPTIONNAL } from '~/utils/dateUtils';
import AppTextInputNext, {
  contramapEmptyString,
  mapNull
} from '~/components/_app/AppTextInput/AppTextInputNext';
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

type WrittenSchema = InferType<typeof writtenSchema>;

function DraftMailInfo() {
  const { getValues } = useFormContext();
  const values = getValues();
  console.log('Values', values);

  return (
    <article className={styles.article}>
      <Typography component="h4" variant="h6" mb={2}>
        Informations sur le courrier
      </Typography>
      <AppTextInputNext<WrittenSchema['writtenAt']>
        name="writtenAt"
        label="En date du ..."
        nativeInputProps={{
          type: 'date'
        }}
        mapValue={mapNull}
        contramapValue={contramapEmptyString}
      />
      <AppTextInputNext<WrittenSchema['writtenFrom']>
        name="writtenFrom"
        label="Écrit à ..."
        mapValue={mapNull}
        contramapValue={contramapEmptyString}
      />
    </article>
  );
}

export default DraftMailInfo;
