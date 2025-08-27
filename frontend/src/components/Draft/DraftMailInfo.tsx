import Typography from '@mui/material/Typography';
import type { DraftUpdatePayload } from '@zerologementvacant/models';
import { useFormContext } from 'react-hook-form';

import AppTextInputNext, {
  contramapEmptyString,
  mapNull
} from '~/components/_app/AppTextInput/AppTextInputNext';
import styles from './draft.module.scss';

function DraftMailInfo() {
  const { getValues } = useFormContext();
  const values = getValues();
  console.log('Values', values);

  return (
    <article className={styles.article}>
      <Typography component="h4" variant="h6" mb={2}>
        Informations sur le courrier
      </Typography>
      <AppTextInputNext<DraftUpdatePayload['writtenAt']>
        name="writtenAt"
        label="En date du ..."
        nativeInputProps={{
          type: 'date'
        }}
        mapValue={mapNull}
        contramapValue={contramapEmptyString}
      />
      <AppTextInputNext<DraftUpdatePayload['writtenFrom']>
        name="writtenFrom"
        label="Écrit à ..."
        mapValue={mapNull}
        contramapValue={contramapEmptyString}
      />
    </article>
  );
}

export default DraftMailInfo;
