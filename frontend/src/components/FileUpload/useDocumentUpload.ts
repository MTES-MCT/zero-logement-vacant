import type { DocumentDTO } from '@zerologementvacant/models';
import { Array } from 'effect';
import { match } from 'ts-pattern';

import {
  isFileValidationError,
  type FileValidationError
} from '~/models/FileValidationError';
import { useUploadDocumentsMutation } from '~/services/document.service';
import { isFetchBaseQueryError } from '~/store/store';

export interface UseDocumentUploadProps {
  /**
   * Called every time documents are successfully uploaded.
   * @param documents
   */
  onUpload(documents: ReadonlyArray<DocumentDTO>): void;
}

export function useDocumentUpload(props: Readonly<UseDocumentUploadProps>) {
  const [uploadDocuments, uploadMutation] = useUploadDocumentsMutation();

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

  function upload(files: ReadonlyArray<File>) {
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

  return {
    isError: uploadMutation.isError,
    isLoading: uploadMutation.isLoading,
    isSuccess: uploadMutation.isSuccess,
    error,
    upload
  };
}
