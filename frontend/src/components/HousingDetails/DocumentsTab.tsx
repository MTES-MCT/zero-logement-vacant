import Pictures from '@codegouvfr/react-dsfr/picto/Pictures';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { match, Pattern } from 'ts-pattern';

import DocumentFullscreenPreview from '~/components/FileUpload/DocumentFullscreenPreview';
import HousingDocumentUpload from '~/components/FileUpload/HousingDocumentUpload';
import DocumentCard from '~/components/HousingDetails/DocumentCard';
import { createDocumentDeleteModal } from '~/components/HousingDetails/DocumentDeleteModal';
import { createDocumentRenameModal } from '~/components/HousingDetails/DocumentRenameModal';
import { useHousing } from '~/hooks/useHousing';
import { useNotification } from '~/hooks/useNotification';
import { useUser } from '~/hooks/useUser';
import {
  useListHousingDocumentsQuery,
  useRemoveDocumentMutation,
  useUpdateDocumentMutation
} from '~/services/document.service';

const documentRenameModal = createDocumentRenameModal();
const documentDeleteModal = createDocumentDeleteModal();

function DocumentsTab() {
  const { housing, housingId } = useHousing();
  const {
    data: documents,
    isLoading,
    isSuccess
  } = useListHousingDocumentsQuery(housingId);
  const { isUsual, isAdmin } = useUser()
  const canWrite = isAdmin || isUsual;

  const [selectedDocument, setSelectedDocument] = useState<DocumentDTO | null>(
    null
  );
  const [documentToDelete, setDocumentToDelete] = useState<DocumentDTO | null>(
    null
  );

  const [fullscreenPreviewIndex, setFullscreenPreviewIndex] = useState<
    number | null
  >(null);

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

  const [removeDocument, removeDocumentMutation] = useRemoveDocumentMutation();
  useNotification({
    toastId: 'document-delete',
    isError: removeDocumentMutation.isError,
    isLoading: removeDocumentMutation.isLoading,
    isSuccess: removeDocumentMutation.isSuccess,
    message: {
      error: 'Erreur lors de la suppression du document',
      loading: 'Suppression du document ...',
      success: 'Document supprimé !'
    }
  });

  function onRename(document: DocumentDTO): void {
    setSelectedDocument(document);
    documentRenameModal.open();
  }

  function onVisualize(index: number): void {
    setFullscreenPreviewIndex(index);
  }

  function onCancelRename(): void {
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

  function onDelete(document: DocumentDTO): void {
    setDocumentToDelete(document);
    documentDeleteModal.open();
  }

  function onCancelDelete(): void {
    setDocumentToDelete(null);
    documentDeleteModal.close();
  }

  function deleteDocument(): void {
    if (!documentToDelete) {
      return;
    }

    removeDocument({
      documentId: documentToDelete.id,
      housingId: housingId
    })
      .unwrap()
      .then(() => {
        setDocumentToDelete(null);
        documentDeleteModal.close();
      })
      .catch((error) => {
        console.warn('Error deleting document', error);
      });
  }

  async function onDownload(document: DocumentDTO): Promise<void> {
    try {
      const response = await fetch(document.url);
      const blob = await response.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = document.filename;
      globalThis.document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document', error);
    }
  }

  if (!housing) {
    return null;
  }

  return (
    <>
      <documentRenameModal.Component
        document={selectedDocument}
        onCancel={onCancelRename}
        onSubmit={rename}
        onDownload={() => {
          if (selectedDocument) {
            onDownload(selectedDocument);
          }
        }}
      />
      <documentDeleteModal.Component
        document={documentToDelete}
        onCancel={onCancelDelete}
        onSubmit={deleteDocument}
      />

      {documents && fullscreenPreviewIndex !== null && (
        <DocumentFullscreenPreview
          documents={documents}
          index={fullscreenPreviewIndex}
          onIndexChange={setFullscreenPreviewIndex}
          open={fullscreenPreviewIndex !== null}
          onClose={() => {
            setFullscreenPreviewIndex(null);
          }}
          onDownload={onDownload}
        />
      )}

      <Stack component="section" spacing="2rem" useFlexGap>
        {canWrite ? (
          <Stack component="header">
            <HousingDocumentUpload housing={housing} />
          </Stack>
        ) : null}

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
                {documents.map((document, index) => (
                  <Grid key={document.id} size={{ xs: 12, md: 6, xl: 4 }}>
                    <DocumentCard
                      document={document}
                      index={index}
                      onDelete={onDelete}
                      onDownload={onDownload}
                      onRename={onRename}
                      onVisualize={onVisualize}
                    />
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
