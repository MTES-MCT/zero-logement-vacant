import {
  ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS,
  type DocumentDTO
} from '@zerologementvacant/models';

import DocumentUpload, {
  type DocumentUploadProps
} from '~/components/FileUpload/DocumentUpload';
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
      accept={ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS as string[]}
      error={error}
      hint="Taille maximale par fichier : 25Mo. Formats supportés : images (png, jpg, heic, webp) et documents (pdf, doc, docx, xls, xlsx, ppt, pptx). Le nom du fichier doit faire moins de 255 caractères. Plusieurs fichiers possibles. Veuillez ne communiquer que les données strictement nécessaires et ne pas partager de données sensibles."
      isError={isError}
      isLoading={isLoading}
      isSuccess={isSuccess}
      label={props.label ?? 'Associez un ou plusieurs documents à ce logement'}
      maxSize={25}
      multiple
      onUpload={upload}
    />
  );
}

export default HousingDocumentUpload;
