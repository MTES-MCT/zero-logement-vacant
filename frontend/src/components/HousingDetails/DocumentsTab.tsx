import Pictures from '@codegouvfr/react-dsfr/picto/Pictures';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';
import type { ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';
import { match, Pattern } from 'ts-pattern';

import DocumentFullscreenPreview from '~/components/FileUpload/DocumentFullscreenPreview';
import HousingDocumentUpload, {
  type HousingDocumentUploadProps
} from '~/components/FileUpload/HousingDocumentUpload';
import DocumentCard, {
  type DocumentCardProps
} from '~/components/HousingDetails/DocumentCard';
import { createDocumentDeleteModal } from '~/components/HousingDetails/DocumentDeleteModal';
import { createDocumentRenameModal } from '~/components/HousingDetails/DocumentRenameModal';
import { useUser } from '~/hooks/useUser';

export interface DocumentsTabProps {
  documents: ReadonlyArray<DocumentDTO>;
  isLoading?: boolean;
  isSuccess?: boolean;
  documentCardProps?: Pick<DocumentCardProps, 'actions'>;
  onUpload: HousingDocumentUploadProps['onUpload'];
  onRename(document: DocumentDTO): void;
  onDelete: DocumentCardProps['onDelete'];
};

function DocumentsTab(props: Readonly<DocumentsTabProps>) {
  const documentRenameModalId = useId();
  const documentRenameModal = useMemo(
    () => createDocumentRenameModal(documentRenameModalId),
    [documentRenameModalId]
  );
  const documentDeleteModalId = useId();
  const documentDeleteModal = useMemo(
    () => createDocumentDeleteModal(documentDeleteModalId),
    [documentDeleteModalId]
  );

  const { isUsual, isAdmin } = useUser();
  const canUpload = isAdmin || isUsual;

  const [selectedDocument, setSelectedDocument] = useState<DocumentDTO | null>(
    null
  );
  const [documentToDelete, setDocumentToDelete] = useState<DocumentDTO | null>(
    null
  );

  const [fullscreenPreviewIndex, setFullscreenPreviewIndex] = useState<
    number | null
  >(null);

  function confirmRename(document: DocumentDTO): void {
    setSelectedDocument(document);
    documentRenameModal.open();
  }

  function cancelRename(): void {
    documentRenameModal.close();
    setSelectedDocument(null);
  }

  function renameDocument(filename: string): void {
    if (!selectedDocument) {
      return;
    }

    props.onRename({ ...selectedDocument, filename });
    documentRenameModal.close();
    setSelectedDocument(null);
  }

  function onVisualize(index: number): void {
    setFullscreenPreviewIndex(index);
  }

  function confirmDeletion(document: DocumentDTO): void {
    setDocumentToDelete(document);
    documentDeleteModal.open();
  }

  function cancelDeletion(): void {
    setDocumentToDelete(null);
    documentDeleteModal.close();
  }

  function deleteDocument(): void {
    if (!documentToDelete) {
      return;
    }

    props.onDelete(documentToDelete);
    documentDeleteModal.close();
    setDocumentToDelete(null);
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

  const { documents } = props;

  return (
    <>
      <documentRenameModal.Component
        document={selectedDocument}
        onCancel={cancelRename}
        onSubmit={renameDocument}
        onDownload={() => {
          if (selectedDocument) {
            onDownload(selectedDocument);
          }
        }}
      />
      <documentDeleteModal.Component
        onCancel={cancelDeletion}
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
        {canUpload ? (
          <Stack component="header">
            <HousingDocumentUpload onUpload={props.onUpload} />
          </Stack>
        ) : null}

        {match({
          documents,
          isLoading: props.isLoading,
          isSuccess: props.isSuccess
        })
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
              <Stack spacing="1rem" useFlexGap>
                <Typography component="h2" variant="h6">
                  Documents ({documents.length})
                </Typography>

                <Grid container spacing="1rem">
                  {documents.map((document, index) => (
                    <Grid key={document.id} size={{ xs: 12, md: 6, xl: 4 }}>
                      <DocumentCard
                        {...props.documentCardProps}
                        document={document}
                        index={index}
                        onDelete={confirmDeletion}
                        onDownload={onDownload}
                        onRename={confirmRename}
                        onVisualize={onVisualize}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            )
          )
          .otherwise(() => null)}
      </Stack>
    </>
  );
}

export default DocumentsTab;
