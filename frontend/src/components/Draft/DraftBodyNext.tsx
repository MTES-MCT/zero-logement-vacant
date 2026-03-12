import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Controller } from 'react-hook-form';
import type { DraftFormSchema } from '~/components/Draft/DraftForm';
import RichEditor from '~/components/RichEditor/RichEditor';
import AppLink from '~/components/_app/AppLink/AppLink';
import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import styles from './draft.module.scss';

function DraftBodyNext() {
  return (
    <Box
      component="article"
      role="group"
      aria-labelledby="draft-body-label"
      className={styles.article}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        mb={2}
      >
        <Typography id="draft-body-label" component="h4" variant="h6">
          Contenu de votre courrier
        </Typography>
        <AppLink
          isSimple
          target="_blank"
          to="https://zlv.notion.site/R-diger-un-courrier-15e88e19d2bc404eaf371ddcb4ca42c5"
        >
          Comment rédiger un bon courrier ?
        </AppLink>
      </Stack>

      <Grid container mb={2}>
        <Grid size={7}>
          <AppTextInputNext<DraftFormSchema, 'subject'>
            name="subject"
            label="Objet"
          />
        </Grid>
      </Grid>
      <Controller
        name="body"
        render={({ field }) => (
          <RichEditor
            ariaLabelledBy="draft-body-label"
            content={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </Box>
  );
}

export default DraftBodyNext;
