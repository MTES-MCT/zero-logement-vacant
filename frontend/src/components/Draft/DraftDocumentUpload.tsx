import type { DocumentDTO } from '@zerologementvacant/models';
import type { DocumentUploadProps } from '~/components/FileUpload/DocumentUpload';
import DocumentUpload, {
  DEFAULT_EXTENSIONS
} from '~/components/FileUpload/DocumentUpload';
import { useDocumentUpload } from '~/components/FileUpload/useDocumentUpload';

export type DraftDocumentUploadProps = Pick<DocumentUploadProps, 'label'> & {
  /**
   * Called every time documents are successfully uploaded.
   * @param document
   */
  onUpload(document: ReadonlyArray<DocumentDTO>): void;
};

function DraftDocumentUpload(props: Readonly<DraftDocumentUploadProps>) {
  const { error, isError, isLoading, isSuccess, upload } = useDocumentUpload({
    onUpload: props.onUpload
  });

  return (
    <DocumentUpload
      id="draft-document-upload"
      accept={DEFAULT_EXTENSIONS}
      error={error}
      hint="Taille maximale par fichier : 5Mo. Formats supportés : pdf, jpg, png"
      isError={isError}
      isLoading={isLoading}
      isSuccess={isSuccess}
      label={props.label ?? 'Ajouter un fichier'}
      maxSize={5}
      onUpload={upload}
    />
  );
}

export default DraftDocumentUpload;
