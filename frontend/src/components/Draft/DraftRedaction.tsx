import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import type { DraftFormSchema } from '~/components/Draft/DraftForm';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import styles from './draft.module.scss';

function DraftRedaction() {
  return (
    <Grid
      container
      component="article"
      className={styles.article}
      role="group"
      aria-labelledby="draft-mail-info-label"
      spacing="1rem"
    >
      <Grid size={12}>
        <Typography
          id="draft-mail-info-label"
          component="h4"
          variant="h6"
          mb={2}
        >
          Date et lieu de rédaction
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <AppTextInputNext<DraftFormSchema, 'writtenAt'>
          name="writtenAt"
          label="En date du ..."
          hintText="Format attendu : jj/mm/aaaa"
          nativeInputProps={{
            type: 'date'
          }}
        />
      </Grid>

      <Grid size={12}>
        <AppTextInputNext<DraftFormSchema, 'writtenFrom'>
          name="writtenFrom"
          label="Écrit à ..."
          mapValue={(value) => value ?? ''}
          contramapValue={(value) => (value === '' ? null : value)}
        />
      </Grid>
    </Grid>
  );
}

export default DraftRedaction;
