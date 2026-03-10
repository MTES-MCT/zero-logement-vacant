import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { match } from 'ts-pattern';
import { useFormContext } from 'react-hook-form';

import DraftDocumentUpload from '~/components/Draft/DraftDocumentUpload';
import type { DraftFormSchema } from '~/components/Draft/DraftForm';
import styles from './draft.module.scss';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import type { DocumentDTO } from '@zerologementvacant/models';

function DraftSignatureNext() {
  const { setValue } = useFormContext<DraftFormSchema>();

  function onUpload(index: 0 | 1): (documents: ReadonlyArray<DocumentDTO>) => void {
    return (documents) => {
      const doc = documents[0] ?? null;
      setValue(
        `sender.signatories.${index}.document`,
        doc?.id ?? null,
        { shouldDirty: true }
      );
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
      className={styles.article}
      container
      component="article"
      role="group"
      alignItems="flex-start"
      justifyContent="flex-end"
      size={{ xs: 12, md: 10 }}
      offset={{ xs: 0, md: 2 }}
    >
      <Grid container size={{ xs: 12, md: 6 }} spacing="1rem">
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
          <DraftDocumentUpload
            label={title(0)}
            onUpload={onUpload(0)}
          />
        </Grid>
      </Grid>

      <Grid container size={{ xs: 12, md: 6 }} spacing="1rem">
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
          <DraftDocumentUpload
            label={title(1)}
            onUpload={onUpload(1)}
          />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default DraftSignatureNext;
