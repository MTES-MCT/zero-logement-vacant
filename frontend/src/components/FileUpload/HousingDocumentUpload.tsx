import {
  ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS,
  type DocumentDTO
} from '@zerologementvacant/models';
import { Array } from 'effect';
import { match } from 'ts-pattern';

import DocumentUpload, {
  type DocumentUploadProps
} from '~/components/FileUpload/DocumentUpload';
import {
  type FileValidationError,
  isFileValidationError
} from '~/models/FileValidationError';
import { useUploadDocumentsMutation } from '~/services/document.service';
import { isFetchBaseQueryError } from '~/store/store';

export type HousingDocumentUploadProps = Pick<DocumentUploadProps, 'label'> & {
  /**
   * Called every time documents are successfully uploaded.
   * @param documents
   */
  onUpload(documents: ReadonlyArray<DocumentDTO>): void;
};

function HousingDocumentUpload(props: Readonly<HousingDocumentUploadProps>) {
  const [uploadDocuments, uploadMutation] = useUploadDocumentsMutation();

  const isLoading = uploadMutation.isLoading;
  const isSuccess = uploadMutation.isSuccess;
  const isError = uploadMutation.isError;

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
    if (!files.length) {
      uploadMutation.reset();
      return;
    }

    uploadDocuments({ files })
      .unwrap()
      .then((documentsOrErrors) => {
        const documents: DocumentDTO[] = documentsOrErrors.filter(
          (item): item is DocumentDTO => !isFileValidationError(item)
        );

        props.onUpload(documents);
      });
  }

  return (
    <DocumentUpload
      id="housing-document-upload"
      accept={ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS as string[]}
      error={error}
      hint="Taille maximale par fichier : 25Mo. Formats supportés : images (png, jpg, heic, webp) et documents (pdf, doc, docx, xls, xlsx, ppt, pptx). Le nom du fichier doit faire moins de 255 caractères. Plusieurs fichiers possibles."
      isError={isError}
      isLoading={isLoading}
      isSuccess={isSuccess}
      label={props.label ?? 'Associez un ou plusieurs documents à ce logement'}
      maxSize={25}
      multiple
      onUpload={onUpload}
    />
  );
}

export default HousingDocumentUpload;
