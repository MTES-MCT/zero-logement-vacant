import { ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS } from '@zerologementvacant/models';
import DocumentUpload from '../FileUpload/DocumentUpload';

export interface HousingListDocumentUploadProps {
  onUpload(files: ReadonlyArray<File>): void;
}

function HousingListDocumentUpload(
  props: Readonly<HousingListDocumentUploadProps>
) {
  function onUpload(files: ReadonlyArray<File>) {
    if (!files.length) {
      return;
    }

    props.onUpload(files);
  }

  return (
    <DocumentUpload
      id="housing-document-upload"
      accept={ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS as string[]}
      error={undefined}
      hint="Taille maximale par fichier : 25Mo. Formats supportés : images (png, jpg, heic, webp) et documents (pdf, doc, docx, xls, xlsx, ppt, pptx). Le nom du fichier doit faire moins de 255 caractères. Plusieurs fichiers possibles."
      isError={false}
      isLoading={false}
      isSuccess={false}
      label="Ajoutez un ou plusieurs documents"
      maxSize={25}
      multiple
      onUpload={onUpload}
    />
  );
}

export default HousingListDocumentUpload;
