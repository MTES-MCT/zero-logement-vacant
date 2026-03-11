import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';
import { skipToken } from '@reduxjs/toolkit/query';
import { useFormContext } from 'react-hook-form';

import type { DraftFormSchema } from '~/components/Draft/DraftForm';
import DraftDocumentUpload from '~/components/Draft/DraftDocumentUpload';
import DocumentPreview from '~/components/FileUpload/DocumentPreview';
import { useGetDocumentQuery } from '~/services/document.service';
import styles from './draft.module.scss';

function DraftSenderLogoNext() {
  const { watch, setValue } = useFormContext<DraftFormSchema>();

  const logo0 = watch('logo.0');
  const logo1 = watch('logo.1');
  const logoQuery0 = useGetDocumentQuery(logo0 ?? skipToken);
  const logoQuery1 = useGetDocumentQuery(logo1 ?? skipToken);

  function onUpload(
    index: 0 | 1
  ): (documents: ReadonlyArray<DocumentDTO>) => void {
    return (documents) => {
      const document = documents[0] ?? null;
      setValue(`logo.${index}`, document?.id ?? null, { shouldDirty: true });
    };
  }

  return (
    <Stack
      component="section"
      role="group"
      aria-labelledby="draft-sender-logo-label"
      className={styles.article}
    >
      <Typography
        id="draft-sender-logo-label"
        component="h4"
        variant="h6"
        sx={{ mb: '0.25rem' }}
      >
        Logos de l’expéditeur
      </Typography>

      <Stack spacing="1rem">
        <DraftDocumentUpload label={null} onUpload={onUpload(0)} />
        <DocumentPreview
          document={logoQuery0.data}
          isError={logoQuery0.isError}
          isLoading={logoQuery0.isLoading}
          responsive="max-width"
          fit="contain"
        />
      </Stack>

      <Stack spacing="1rem" sx={{ mt: '1.5rem' }}>
        <DraftDocumentUpload hint={null} label={null} onUpload={onUpload(1)} />
        <DocumentPreview
          document={logoQuery1.data}
          isError={logoQuery1.isError}
          isLoading={logoQuery1.isLoading}
          responsive="max-width"
          fit="contain"
        />
      </Stack>
    </Stack>
  );
}

export default DraftSenderLogoNext;
