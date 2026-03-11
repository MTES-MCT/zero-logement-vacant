import type { DocumentDTO } from '@zerologementvacant/models';
import type { DocumentUploadProps } from '~/components/FileUpload/DocumentUpload';
import DocumentUpload, {
  DEFAULT_EXTENSIONS
} from '~/components/FileUpload/DocumentUpload';
import { useDocumentUpload } from '~/components/FileUpload/useDocumentUpload';

export type DraftDocumentUploadProps = Pick<
  DocumentUploadProps,
  'hint' | 'label'
> & {
  /**
   * Called every time documents are successfully uploaded.
   * @param document
   */
  onUpload(document: ReadonlyArray<DocumentDTO>): void;
};

function DraftDocumentUpload(props: Readonly<DraftDocumentUploadProps>) {
  const { onUpload, ...documentUploadProps } = props;
  const { error, isError, isLoading, isSuccess, upload } = useDocumentUpload({
    onUpload
  });

  return (
    <DocumentUpload
      {...documentUploadProps}
      id="draft-document-upload"
      accept={DEFAULT_EXTENSIONS}
      error={error}
      isError={isError}
      isLoading={isLoading}
      isSuccess={isSuccess}
      maxSize={5}
      multiple={false}
      onUpload={upload}
    />
  );
}

export default DraftDocumentUpload;
