import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { Controller } from 'react-hook-form';
import { object, string } from 'yup-next';

import RichEditor from '../RichEditor/RichEditor';
import AppLink from '../_app/AppLink/AppLink';
import AppTextInputNext, {
  contramapEmptyString,
  mapNull
} from '../_app/AppTextInput/AppTextInputNext';
import styles from './draft.module.scss';

export const bodySchema = object({
  subject: string().defined().nullable().default(null),
  body: string().defined().nullable().default(null)
});

function DraftBody() {
  return (
    <Grid
      component="article"
      container
      className={styles.article}
      rowSpacing="1rem"
    >
      <Grid
        direction="row"
        size={12}
        sx={{ display: 'flex', justifyContent: 'space-between' }}
      >
        <Typography
          id="draft-body-label"
          component="h4"
          variant="h6"
          sx={{ display: 'inline-block' }}
        >
          Contenu de votre courrier
        </Typography>
        <AppLink
          isSimple
          target="_blank"
          to="https://zlv.notion.site/R-diger-un-courrier-15e88e19d2bc404eaf371ddcb4ca42c5"
        >
          Comment rédiger un bon courrier ?
        </AppLink>
      </Grid>
      <Grid size={7}>
        <AppTextInputNext
          name="subject"
          label="Objet"
          mapValue={mapNull}
          contramapValue={contramapEmptyString}
        />
      </Grid>
      <Grid size={12}>
        <Controller
          name="body"
          render={({ field }) => (
            <RichEditor
              ariaLabelledBy="draft-body-label"
              content={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </Grid>
    </Grid>
  );
}

export default DraftBody;
