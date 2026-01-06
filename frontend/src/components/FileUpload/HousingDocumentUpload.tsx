import { ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS } from '@zerologementvacant/models';
import { Array } from 'effect';
import { match } from 'ts-pattern';
import DocumentUpload from '~/components/FileUpload/DocumentUpload';
import {
  type FileValidationError,
  isFileValidationError
} from '~/models/FileValidationError';
import type { Housing } from '~/models/Housing';
import { useUploadHousingDocumentsMutation } from '~/services/document.service';
import { isFetchBaseQueryError } from '~/store/store';

export interface HousingDocumentUploadProps {
  housing: Housing;
}

function HousingDocumentUpload(props: Readonly<HousingDocumentUploadProps>) {
  const [upload, uploadMutation] = useUploadHousingDocumentsMutation();

  const documentsOrErrors = uploadMutation.data ?? [];
  const errors: ReadonlyArray<FileValidationError> =
    uploadMutation.isError &&
    uploadMutation.error &&
    isFetchBaseQueryError(uploadMutation.error) &&
    uploadMutation.error.data &&
    Array.isArray(uploadMutation.error.data) &&
    Array.every(uploadMutation.error.data, isFileValidationError)
      ? uploadMutation.error.data
      : documentsOrErrors.filter(isFileValidationError);

  const error: string | undefined = match(errors.length)
    .returnType<string | undefined>()
    .with(0, () => undefined)
    .with(
      documentsOrErrors.length,
      () =>
        'Aucun fichier n’a pu être importé, car le format ne respecte pas les consignes d’import. Essayez avec d’autres documents ou modifiez les documents que vous souhaitez importer.'
    )
    .otherwise(
      () =>
        'Certains fichiers n’ont pas pu être importés, car le format ne respecte pas les consignes d’import. Essayez avec d’autres documents ou modifiez les documents que vous souhaitez importer.'
    );

  function onUpload(files: ReadonlyArray<File>) {
    upload({
      housingId: props.housing.id,
      files: files
    });
  }

  return (
    <DocumentUpload
      id="housing-document-upload"
      accept={ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS as string[]}
      error={error}
      hint="Taille maximale par fichier : 25Mo. Formats supportés : images (png, jpg, heic, webp) et documents (pdf, doc, docx, xls, xlsx, ppt, pptx). Le nom du fichier doit faire moins de 255 caractères. Plusieurs fichiers possibles."
      isError={uploadMutation.isError}
      isLoading={uploadMutation.isLoading}
      isSuccess={uploadMutation.isSuccess}
      label="Associez un ou plusieurs documents à ce logement"
      maxSize={25}
      multiple
      onUpload={onUpload}
    />
  );
}

export default HousingDocumentUpload;
