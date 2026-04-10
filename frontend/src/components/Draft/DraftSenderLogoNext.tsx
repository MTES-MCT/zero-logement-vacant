import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';
import { useFormContext } from 'react-hook-form';

import DraftDocumentUpload from '~/components/Draft/DraftDocumentUpload';
import type { DraftFormSchema } from '~/components/Draft/DraftForm';
import DocumentPreview from '~/components/FileUpload/DocumentPreview';
import styles from './draft.module.scss';

function DraftSenderLogoNext() {
  const { watch, setValue } = useFormContext<DraftFormSchema>();

  function onUpload(
    index: 0 | 1
  ): (documents: ReadonlyArray<DocumentDTO>) => void {
    return (documents) => {
      const document = documents.at(0) ?? null;
      setValue(`logo.${index}`, document, { shouldDirty: true });
    };
  }

  const [firstLogo, secondLogo] = watch(['logo.0', 'logo.1']);

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
          document={firstLogo ?? undefined}
          responsive="max-width"
          fit="contain"
        />
      </Stack>

      <Stack spacing="1rem" sx={{ mt: '1.5rem' }}>
        <DraftDocumentUpload hint={null} label={null} onUpload={onUpload(1)} />
        <DocumentPreview
          document={secondLogo ?? undefined}
          responsive="max-width"
          fit="contain"
        />
      </Stack>
    </Stack>
  );
}

export default DraftSenderLogoNext;
