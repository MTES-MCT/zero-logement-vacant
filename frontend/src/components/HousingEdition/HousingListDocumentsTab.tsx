import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';
import { useId, useMemo, useState } from 'react';
import { useController } from 'react-hook-form';
import { array, mixed, object, type InferType } from 'yup';

import HousingDocumentUpload, {
  type HousingDocumentUploadProps
} from '~/components/FileUpload/HousingDocumentUpload';
import DocumentCard, {
  type DocumentCardProps
} from '~/components/HousingDetails/DocumentCard';
import { createDocumentDeleteModal } from '~/components/HousingDetails/DocumentDeleteModal';
import { useDeleteDocumentMutation } from '~/services/document.service';

export const documentsSchema = object({
  documents: array().of(mixed<DocumentDTO>().required()).default([])
});

export type DocumentsSchema = InferType<typeof documentsSchema>;

function HousingListDocumentsTab() {
  const { field } = useController<DocumentsSchema, 'documents'>({
    name: 'documents'
  });

  const onUpload: HousingDocumentUploadProps['onUpload'] = (documents) => {
    field.onChange([...documents, ...field.value]);
  };

  const [deleting, setDeleting] = useState<DocumentDTO | null>(null);
  const [deleteDocument] = useDeleteDocumentMutation();
  const id = useId();
  const documentDeleteModal = useMemo(
    () => createDocumentDeleteModal(id),
    [id]
  );

  const onDelete: DocumentCardProps['onDelete'] = (document) => {
    setDeleting(document);
    documentDeleteModal.open();
  };

  function cancelDeletion(): void {
    setDeleting(null);
    documentDeleteModal.close();
  }

  function confirmDeletion(): void {
    if (deleting) {
      deleteDocument(deleting.id);
      field.onChange(field.value.filter(({ id }) => id !== deleting.id));
      documentDeleteModal.close();
    }
  }

  return (
    <>
      <documentDeleteModal.Component
        onCancel={cancelDeletion}
        onSubmit={confirmDeletion}
      />

      <Stack component="section" spacing="2rem" useFlexGap>
        <Stack component="header">
          <HousingDocumentUpload
            label="Associez un ou plusieurs documents à ces logements"
            onUpload={onUpload}
          />
        </Stack>

        <Stack spacing="1rem" useFlexGap>
          <Typography component="h2" variant="h6">
            Documents ({field.value.length})
          </Typography>

          <Grid container spacing="1rem">
            {field.value.map((document, index) => (
              <Grid key={document.id} size={{ xs: 12, md: 6, xl: 4 }}>
                <DocumentCard
                  actions="remove-only"
                  document={document}
                  index={index}
                  onDelete={onDelete}
                />
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Stack>
    </>
  );
}

export default HousingListDocumentsTab;
