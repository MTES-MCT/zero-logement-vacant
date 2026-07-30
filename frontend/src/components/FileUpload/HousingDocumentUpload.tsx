import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_SIZE_IN_MiB,
  type DocumentDTO
} from '@zerologementvacant/models';

import DocumentUpload, {
  type DocumentUploadProps
} from '~/components/FileUpload/DocumentUpload';
import DocumentUploadHint from '~/components/FileUpload/DocumentUploadHint';
import { useDocumentUpload } from '~/components/FileUpload/useDocumentUpload';

export type HousingDocumentUploadProps = Pick<DocumentUploadProps, 'label'> & {
  /**
   * Called every time documents are successfully uploaded.
   * @param documents
   */
  onUpload(documents: ReadonlyArray<DocumentDTO>): void;
};

function HousingDocumentUpload(props: Readonly<HousingDocumentUploadProps>) {
  const { error, isError, isLoading, isSuccess, upload } = useDocumentUpload({
    onUpload: props.onUpload
  });

  return (
    <DocumentUpload
      id="housing-document-upload"
      accept={ACCEPTED_DOCUMENT_EXTENSIONS as string[]}
      error={error}
      hint={<DocumentUploadHint />}
      isError={isError}
      isLoading={isLoading}
      isSuccess={isSuccess}
      label={props.label ?? 'Associez un ou plusieurs documents à ce logement'}
      maxSize={MAX_DOCUMENT_SIZE_IN_MiB}
      multiple
      onUpload={upload}
    />
  );
}

export default HousingDocumentUpload;
