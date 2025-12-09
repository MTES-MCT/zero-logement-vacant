import Pictures from '@codegouvfr/react-dsfr/picto/Pictures';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { match, Pattern } from 'ts-pattern';

import HousingDocumentUpload from '~/components/FileUpload/HousingDocumentUpload';
import DocumentCard from '~/components/HousingDetails/DocumentCard';
import { createDocumentRenameModal } from '~/components/HousingDetails/DocumentRenameModal';
import { useHousing } from '~/hooks/useHousing';
import { useNotification } from '~/hooks/useNotification';
import {
  useListHousingDocumentsQuery,
  useUpdateDocumentMutation
} from '~/services/document.service';

const documentRenameModal = createDocumentRenameModal();

function DocumentsTab() {
  const { housing, housingId } = useHousing();
  const {
    data: documents,
    isLoading,
    isSuccess
  } = useListHousingDocumentsQuery(housingId);

  const [selectedDocument, setSelectedDocument] = useState<DocumentDTO | null>(
    null
  );

  const [updateDocument, updateDocumentMutation] = useUpdateDocumentMutation();
  useNotification({
    toastId: 'document-rename',
    isError: updateDocumentMutation.isError,
    isLoading: updateDocumentMutation.isLoading,
    isSuccess: updateDocumentMutation.isSuccess,
    message: {
      error: 'Erreur lors du renommage du document',
      loading: 'Renommage du document ...',
      success: 'Document renommé !'
    }
  });

  function onRename(document: DocumentDTO): void {
    setSelectedDocument(document);
    documentRenameModal.open();
  }

  function onCancel(): void {
    setSelectedDocument(null);
    documentRenameModal.close();
  }

  function rename(filename: string): void {
    if (!selectedDocument) {
      return;
    }

    updateDocument({
      documentId: selectedDocument.id,
      housingId: housingId,
      filename
    })
      .unwrap()
      .then(() => {
        setSelectedDocument(null);
        documentRenameModal.close();
      })
      .catch((error) => {
        console.warn('Error renaming document', error);
      });
  }

  if (!housing) {
    return null;
  }

  return (
    <>
      <documentRenameModal.Component
        document={selectedDocument}
        onCancel={onCancel}
        onSubmit={rename}
      />

      <Stack component="section" spacing="2rem" useFlexGap>
        <Stack component="header">
          <HousingDocumentUpload housing={housing} />
        </Stack>

        {match({ documents, isLoading, isSuccess })
          .returnType<ReactNode>()
          .with({ isSuccess: true, documents: [] }, () => (
            <Stack
              component="section"
              spacing="0.75rem"
              useFlexGap
              sx={{ alignItems: 'center', textAlign: 'center' }}
            >
              <Pictures width="7.5rem" height="7.5rem" />
              <Typography
                component="p"
                variant="subtitle2"
                sx={{ fontWeight: 500, width: '17rem' }}
              >
                Il n’y a pas de document associé à ce logement
              </Typography>
            </Stack>
          ))
          .with(
            {
              isSuccess: true,
              documents: [Pattern.any, ...Pattern.array(Pattern.any)]
            },
            ({ documents }) => (
              <Grid container spacing="1rem">
                {documents.map((document) => (
                  <Grid key={document.id} size={{ xs: 12, md: 4 }}>
                    <DocumentCard document={document} onRename={onRename} />
                  </Grid>
                ))}
              </Grid>
            )
          )
          .otherwise(() => null)}
      </Stack>
    </>
  );
}

export default DocumentsTab;
