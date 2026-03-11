import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';
import { useFormContext } from 'react-hook-form';
import { match } from 'ts-pattern';

import Stack from '@mui/material/Stack';
import { skipToken } from '@reduxjs/toolkit/query';
import DraftDocumentUpload from '~/components/Draft/DraftDocumentUpload';
import type { DraftFormSchema } from '~/components/Draft/DraftForm';
import DocumentPreview from '~/components/FileUpload/DocumentPreview';
import { useGetDocumentQuery } from '~/services/document.service';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import styles from './draft.module.scss';

function DraftSignatureNext() {
  const { watch, setValue } = useFormContext<DraftFormSchema>();

  const document0 = watch('sender.signatories.0.document');
  const document1 = watch('sender.signatories.1.document');
  const documentQuery0 = useGetDocumentQuery(document0 ?? skipToken);
  const documentQuery1 = useGetDocumentQuery(document1 ?? skipToken);

  function onUpload(
    index: 0 | 1
  ): (documents: ReadonlyArray<DocumentDTO>) => void {
    return (documents) => {
      const document = documents[0] ?? null;
      setValue(`sender.signatories.${index}.document`, document?.id ?? null, {
        shouldDirty: true
      });
    };
  }

  function title(index: number): string {
    return match(index)
      .with(0, () => 'Signature du premier expéditeur')
      .with(1, () => 'Signature du second expéditeur')
      .otherwise(() => "Signature de l'expéditeur");
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
            {title(0)}
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<DraftFormSchema, 'sender.signatories.0.firstName'>
            name="sender.signatories.0.firstName"
            label="Prénom du signataire"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<DraftFormSchema, 'sender.signatories.0.lastName'>
            name="sender.signatories.0.lastName"
            label="Nom du signataire"
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
            <DraftDocumentUpload label={title(0)} onUpload={onUpload(0)} />
            <DocumentPreview
              document={documentQuery0.data}
              isError={documentQuery0.isError}
              isLoading={documentQuery0.isLoading}
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
            {title(1)}
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
            <DraftDocumentUpload label={title(1)} onUpload={onUpload(1)} />
            <DocumentPreview
              document={documentQuery1.data}
              isError={documentQuery1.isError}
              isLoading={documentQuery1.isLoading}
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
