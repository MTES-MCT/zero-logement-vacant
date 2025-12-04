import { Upload, type UploadProps } from '@codegouvfr/react-dsfr/Upload';
import mime from 'mime';
import { type ChangeEvent } from 'react';

import { useNotification } from '~/hooks/useNotification';

const DEFAULT_EXTENSIONS = ['pdf', 'jpg', 'png'];
const MAX_SIZE = 5; // MB

export type DocumentUploadProps = UploadProps & {
  /**
   * @example
   * ['pdf', 'jpg', 'png']
   */
  accept?: string[];
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  /**
   * Maximum file size in MB.
   */
  maxSize?: number;
  /**
   * Called when documents are uploaded successfully.
   * @param files
   */
  onUpload(files: ReadonlyArray<File>): Promise<void>;
};

function DocumentUpload(props: Readonly<DocumentUploadProps>) {
  const { accept = DEFAULT_EXTENSIONS, ...uploadProps } = props;
  const types = accept ?? DEFAULT_EXTENSIONS;
  const hint =
    props.hint ??
    `Taille maximale : ${props.maxSize ?? MAX_SIZE} Mo. Formats supportés : ${types.join(', ')}`;

  useNotification({
    isError: props.isError,
    isLoading: props.isLoading,
    isSuccess: props.isSuccess,
    toastId: 'file-upload'
  });

  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    const files = event.target.files ? [...event.target.files] : [];
    props.onUpload(files);
  }

  return (
    <Upload
      {...uploadProps}
      hint={hint}
      nativeInputProps={{
        accept: types.map((type) => mime.getType(type)).join(','),
        onChange
      }}
    />
  );
}

export default DocumentUpload;
