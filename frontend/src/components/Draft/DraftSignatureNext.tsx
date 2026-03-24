import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';
import { useFormContext } from 'react-hook-form';

import Stack from '@mui/material/Stack';
import DraftDocumentUpload from '~/components/Draft/DraftDocumentUpload';
import type { DraftFormSchema } from '~/components/Draft/DraftForm';
import DocumentPreview from '~/components/FileUpload/DocumentPreview';
import type { Draft } from '~/models/Draft';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import styles from './draft.module.scss';

export interface DraftSignatureNextProps {
  draft: Draft;
}

function DraftSignatureNext(props: Readonly<DraftSignatureNextProps>) {
  const { setValue } = useFormContext<DraftFormSchema>();

  function onUpload(index: 0 | 1) {
    return (documents: ReadonlyArray<DocumentDTO>): void => {
      const document = documents[0] ?? null;
      setValue(`sender.signatories.${index}.document`, document?.id ?? null, {
        shouldDirty: true
      });
    };
  }

  return (
    <Grid
      container
      component="article"
      role="group"
      sx={{
        alignItems: 'flex-start',
        justifyContent: 'flex-end'
      }}
      size={{ xs: 12, md: 10 }}
      offset={{ xs: 0, md: 2 }}
      spacing="1rem"
    >
      <Grid
        className={styles.article}
        container
        size={{ xs: 12, md: 6 }}
        spacing="1rem"
      >
        <Grid size={12}>
          <Typography component="h4" variant="h6">
            Signature du premier expéditeur
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<DraftFormSchema, 'sender.signatories.0.firstName'>
            name="sender.signatories.0.firstName"
            label="Prénom du signataire"
            mapValue={(value) => value ?? ''}
            contramapValue={(value) => (value === '' ? null : value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<DraftFormSchema, 'sender.signatories.0.lastName'>
            name="sender.signatories.0.lastName"
            label="Nom du signataire"
            mapValue={(value) => value ?? ''}
            contramapValue={(value) => (value === '' ? null : value)}
          />
        </Grid>

        <Grid size={12}>
          <AppTextInputNext<DraftFormSchema, 'sender.signatories.0.role'>
            name="sender.signatories.0.role"
            label="Rôle du signataire"
          />
        </Grid>

        <Grid size={12}>
          <Stack direction="column" spacing="1rem">
            <DraftDocumentUpload onUpload={onUpload(0)} />
            <DocumentPreview
              document={
                props.draft.sender.signatories[0]?.document ?? undefined
              }
              responsive="max-width"
              fit="contain"
            />
          </Stack>
        </Grid>
      </Grid>

      <Grid
        className={styles.article}
        container
        size={{ xs: 12, md: 6 }}
        spacing="1rem"
      >
        <Grid size={12}>
          <Typography component="h4" variant="h6">
            Signature du second expéditeur
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<DraftFormSchema, 'sender.signatories.1.firstName'>
            name="sender.signatories.1.firstName"
            label="Prénom du signataire"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<DraftFormSchema, 'sender.signatories.1.lastName'>
            name="sender.signatories.1.lastName"
            label="Nom du signataire"
          />
        </Grid>

        <Grid size={12}>
          <AppTextInputNext<DraftFormSchema, 'sender.signatories.1.role'>
            name="sender.signatories.1.role"
            label="Rôle du signataire"
          />
        </Grid>

        <Grid size={12}>
          <Stack direction="column" spacing="1rem">
            <DraftDocumentUpload onUpload={onUpload(1)} />
            <DocumentPreview
              document={
                props.draft.sender.signatories[1]?.document ?? undefined
              }
              responsive="max-width"
              fit="contain"
            />
          </Stack>
        </Grid>
      </Grid>
    </Grid>
  );
}

export default DraftSignatureNext;
