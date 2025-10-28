import { Upload } from '@codegouvfr/react-dsfr/Upload';
import mime from 'mime';
import React from 'react';
import type { ReactNode } from 'react';

import { useUploadFileMutation } from '../../services/file.service';
import { useNotification } from '../../hooks/useNotification';
import type { FileUploadDTO } from '@zerologementvacant/models';

const DEFAULT_TYPES = ['pdf', 'jpg', 'png'];
const MAX_SIZE = 5; // Mo

interface Props {
  id: string;
  accept?: string[];
  hint?: string;
  label?: ReactNode;
  /**
   * Called when a file is uploaded successfully.
   * @param file
   */
  onUpload?(file: FileUploadDTO): void;
}

function FileUpload(props: Readonly<Props>) {
  const types = props.accept ?? DEFAULT_TYPES;
  const hint =
    props.hint ??
    `Taille maximale : ${MAX_SIZE} Mo. Formats supportés : ${types.join(', ')}`;
  const accept = types.map((type) => mime.getType(type)).join(', ');
  const [upload, mutation] = useUploadFileMutation();

  useNotification({
    isError: mutation.isError,
    isLoading: mutation.isLoading,
    isSuccess: mutation.isSuccess,
    toastId: 'file-upload'
  });

  function onChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) {
      upload(file)
        .unwrap()
        .then((fileUpload) => {
          props.onUpload?.(fileUpload);
        }).catch(() => {});
    }
  }

  return (
    <Upload
      label={props.label}
      multiple={false}
      hint={hint}
      nativeInputProps={{ accept, id: props.id, onChange }}
    />
  );
}

export default FileUpload;
