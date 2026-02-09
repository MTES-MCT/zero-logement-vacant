import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Skeleton from '@mui/material/Skeleton';
import { skipToken } from '@reduxjs/toolkit/query';

import type { HousingDocumentUploadProps } from '~/components/FileUpload/HousingDocumentUpload';
import { useHousing } from '~/hooks/useHousing';
import { useNotification } from '~/hooks/useNotification';
import {
  useFindHousingDocumentsQuery,
  useLinkDocumentsToHousingMutation,
  useUnlinkDocumentMutation,
  useUpdateDocumentMutation
} from '~/services/document.service';
import type { DocumentCardProps } from './DocumentCard';
import DocumentsTab from './DocumentsTab';
import HistoryTab from './HistoryTab';
import HousingTab from './HousingTab';
import MobilizationTab from './MobilizationTab';

function HousingDetailsCard() {
  const { housing, isLoading: isHousingLoading } = useHousing();

  const {
    data: housingDocuments,
    isLoading: isDocumentLoading,
    isSuccess: isDocumentSuccess
  } = useFindHousingDocumentsQuery(housing?.id ?? skipToken);

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
  const rename: DocumentCardProps['onRename'] = (document) => {
    updateDocument({
      id: document.id,
      filename: document.filename
    });
  };

  const [unlinkDocument, unlinkDocumentMutation] = useUnlinkDocumentMutation();
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
  const remove: DocumentCardProps['onDelete'] = (document) => {
    if (housing) {
      unlinkDocument({
        housingId: housing.id,
        documentId: document.id
      });
    }
  };

  const [linkDocuments] = useLinkDocumentsToHousingMutation();
  const link: HousingDocumentUploadProps['onUpload'] = (documents) => {
    if (housing) {
      linkDocuments({
        housingId: housing.id,
        documentIds: documents.map((document) => document.id)
      });
    }
  };

  if (isHousingLoading) {
    return (
      <Skeleton
        animation="wave"
        variant="rectangular"
        width="100%"
        height="60rem"
      />
    );
  }

  return (
    <Tabs
      tabs={[
        {
          label: 'Logement et bâtiment',
          content: <HousingTab />,
          isDefault: true
        },
        {
          label: 'Suivi',
          content: <MobilizationTab />
        },
        {
          label: 'Documents',
          content: (
            <DocumentsTab
              documents={housingDocuments ?? []}
              isLoading={isDocumentLoading}
              isSuccess={isDocumentSuccess}
              onUpload={link}
              onRename={rename}
              onDelete={remove}
            />
          )
        },
        {
          label: 'Notes et historique',
          content: <HistoryTab />
        }
      ]}
    />
  );
}

export default HousingDetailsCard;
