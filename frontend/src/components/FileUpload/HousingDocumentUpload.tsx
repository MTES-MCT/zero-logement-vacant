import DocumentUpload from '~/components/FileUpload/DocumentUpload';
import type { Housing } from '~/models/Housing';
import { useUploadHousingDocumentsMutation } from '~/services/document.service';

export interface HousingDocumentUploadProps {
  housing: Housing;
}

function HousingDocumentUpload(props: HousingDocumentUploadProps) {
  const [upload, uploadMutation] = useUploadHousingDocumentsMutation();

  async function onUpload(files: ReadonlyArray<File>) {
    await upload({
      housingId: props.housing.id,
      files: files
    });
  }

  return (
    <DocumentUpload
      id="housing-document-upload"
      accept={['png', 'jpg', 'pdf', 'heic', 'webp', 'docx']}
      hint="Taille maximale par fichier : 25Mo. Formats supportés : images (png, jpg, heic, webp, etc.) et documents (docx, xlsx, ppt, etc.). Le nom du fichier doit faire moins de 255 caractères. Plusieurs fichiers possibles."
      isError={uploadMutation.isError}
      isLoading={uploadMutation.isLoading}
      isSuccess={uploadMutation.isSuccess}
      label="Ajouter un ou plusieurs documents à associer à ce logement"
      maxSize={25}
      multiple
      onUpload={onUpload}
    />
  );
}

export default HousingDocumentUpload;
