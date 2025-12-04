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
      id="file-upload"
      isError={uploadMutation.isError}
      isLoading={uploadMutation.isLoading}
      isSuccess={uploadMutation.isSuccess}
      multiple
      onUpload={onUpload}
    />
  );
}

export default HousingDocumentUpload;
