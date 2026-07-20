import Pictures from '@codegouvfr/react-dsfr/picto/Pictures';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { CampaignDTO, DocumentDTO } from '@zerologementvacant/models';
import type { ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';
import { match, Pattern } from 'ts-pattern';

import CampaignDocumentUpload from '~/components/FileUpload/CampaignDocumentUpload';
import DocumentFullscreenPreview from '~/components/FileUpload/DocumentFullscreenPreview';
import DocumentCard, {
  type DocumentCardProps
} from '~/components/HousingDetails/DocumentCard';
import { createDocumentDeleteModal } from '~/components/HousingDetails/DocumentDeleteModal';
import { createDocumentRenameModal } from '~/components/HousingDetails/DocumentRenameModal';
import { useNotification } from '~/hooks/useNotification';
import { useUser } from '~/hooks/useUser';
import {
  useFindCampaignDocumentsQuery,
  useLinkDocumentsToCampaignMutation,
  useUnlinkCampaignDocumentMutation,
  useUpdateDocumentMutation
} from '~/services/document.service';

export interface CampaignDocumentsTabProps {
  campaign: CampaignDTO;
}

function CampaignDocumentsTab(props: Readonly<CampaignDocumentsTabProps>) {
  const { campaign } = props;

  const {
    data: documents,
    isLoading,
    isSuccess
  } = useFindCampaignDocumentsQuery(campaign.id);

  const [linkDocuments] = useLinkDocumentsToCampaignMutation();
  function onUpload(uploaded: ReadonlyArray<DocumentDTO>): void {
    linkDocuments({
      campaignId: campaign.id,
      documentIds: uploaded.map((document) => document.id)
    });
  }

  const [updateDocument, updateDocumentMutation] = useUpdateDocumentMutation();
  useNotification({
    toastId: 'document-update',
    isError: updateDocumentMutation.isError,
    isLoading: updateDocumentMutation.isLoading,
    isSuccess: updateDocumentMutation.isSuccess,
    message: {
      error: 'Erreur lors du renommage du document.',
      loading: 'Renommage du document...',
      success: 'Document renommé !'
    }
  });
  function onRename(document: DocumentDTO): void {
    updateDocument({ id: document.id, filename: document.filename });
  }

  const [unlinkDocument, unlinkDocumentMutation] =
    useUnlinkCampaignDocumentMutation();
  useNotification({
    toastId: 'document-delete',
    isError: unlinkDocumentMutation.isError,
    isLoading: unlinkDocumentMutation.isLoading,
    isSuccess: unlinkDocumentMutation.isSuccess,
    message: {
      error: 'Erreur lors de la suppression du document',
      loading: 'Suppression du document...',
      success: 'Document supprimé !'
    }
  });
  const onDelete: DocumentCardProps['onDelete'] = (document) => {
    unlinkDocument({ campaignId: campaign.id, documentId: document.id });
  };

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
    onRename({ ...selectedDocument, filename });
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
    onDelete(documentToDelete);
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

  const documentList = documents ?? [];

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

      {fullscreenPreviewIndex !== null && (
        <DocumentFullscreenPreview
          documents={documentList}
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
            <CampaignDocumentUpload onUpload={onUpload} />
          </Stack>
        ) : null}

        {match({ documents: documentList, isLoading, isSuccess })
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
                Il n’y a pas de document associé à cette campagne
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

export default CampaignDocumentsTab;
