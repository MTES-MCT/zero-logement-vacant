import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import RichEditor from '~/components/RichEditor/RichEditor';
import AppLink from '~/components/_app/AppLink/AppLink';
import AppTextInput from '~/components/_app/AppTextInput/AppTextInput';
import { useForm } from '~/hooks/useForm';
import styles from './draft.module.scss';

interface Props {
  form: ReturnType<typeof useForm>;
  subject: string;
  body: string;
  onChange(value: Body): void;
}

export interface Body {
  subject: string;
  body: string;
}

function DraftBody(props: Readonly<Props>) {
  return (
    <Box component="article" className={styles.article}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
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
          <AppTextInput
            inputForm={props.form}
            inputKey="subject"
            label="Objet"
            value={props.subject}
            onChange={(event) =>
              props.onChange({
                subject: event.target.value,
                body: props.body
              })
            }
          />
        </Grid>
      </Grid>
      <RichEditor
        ariaLabelledBy="draft-body-label"
        content={props.body}
        onChange={(content) =>
          props.onChange({
            subject: props.subject,
            body: content
          })
        }
      />
    </Box>
  );
}

export default DraftBody;
