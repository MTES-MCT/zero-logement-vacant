import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_SIZE_IN_MiB,
  type DocumentDTO
} from '@zerologementvacant/models';

import DocumentUpload, {
  type DocumentUploadProps
} from '~/components/FileUpload/DocumentUpload';
import { useDocumentUpload } from '~/components/FileUpload/useDocumentUpload';

export type CampaignDocumentUploadProps = Pick<DocumentUploadProps, 'label'> & {
  /**
   * Called every time documents are successfully uploaded.
   * @param documents
   */
  onUpload(documents: ReadonlyArray<DocumentDTO>): void;
};

function CampaignDocumentUpload(props: Readonly<CampaignDocumentUploadProps>) {
  const { error, isError, isLoading, isSuccess, upload } = useDocumentUpload({
    onUpload: props.onUpload
  });

  return (
    <DocumentUpload
      id="campaign-document-upload"
      accept={ACCEPTED_DOCUMENT_EXTENSIONS as string[]}
      error={error}
      hint={
        <div>
          Taille maximale par fichier : 25Mo. Formats supportés : images (png,
          jpg, heic, webp, etc.) et documents (docx, xlsx, ppt, etc.). Le nom du
          fichier doit faire moins de 255 caractères. Plusieurs fichiers
          possibles. Veillez à ne pas partager de{' '}
          <a
            href="https://cnil.fr/fr/definition/donnee-sensible#:~:text=Ce%20sont%20des%20informations%20qui,physique%20de%20mani%C3%A8re%20unique%2C%20des."
            target="_blank"
            rel="noopener noreferrer"
          >
            données sensibles
            <span className="fr-sr-only"> (nouvelle fenêtre)</span>
          </a>
          .
        </div>
      }
      isError={isError}
      isLoading={isLoading}
      isSuccess={isSuccess}
      label={
        props.label ?? 'Associez un ou plusieurs documents à cette campagne'
      }
      maxSize={MAX_DOCUMENT_SIZE_IN_MiB}
      multiple
      onUpload={upload}
    />
  );
}

export default CampaignDocumentUpload;
