import type { CampaignDTO, DocumentDTO } from '@zerologementvacant/models';

import CampaignDocumentUpload from '~/components/FileUpload/CampaignDocumentUpload';
import type { DocumentCardProps } from '~/components/HousingDetails/DocumentCard';
import DocumentsTab from '~/components/HousingDetails/DocumentsTab';
import { useNotification } from '~/hooks/useNotification';
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

  return (
    <DocumentsTab
      documents={documents ?? []}
      isLoading={isLoading}
      isSuccess={isSuccess}
      onRename={onRename}
      onDelete={onDelete}
      emptyStateMessage="Il n’y a pas de document associé à cette campagne"
      uploadSlot={<CampaignDocumentUpload onUpload={onUpload} />}
    />
  );
}

export default CampaignDocumentsTab;
