import { Upload } from '@codegouvfr/react-dsfr/Upload';
import mime from 'mime';
import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'react-toastify';

import { useUploadFileMutation } from '../../services/file.service';
import { useNotification } from '../../hooks/useNotification';
import type { FileUploadDTO } from '@zerologementvacant/models';
import { getFileUploadErrorMessage } from '../../utils/fileUploadErrors';

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

  // Show custom error message based on error reason
  useEffect(() => {
    if (mutation.isError && mutation.error) {
      const errorMessage = getFileUploadErrorMessage(mutation.error);
      toast.error(errorMessage, {
        toastId: 'file-upload-error'
      });
    }
  }, [mutation.isError, mutation.error]);

  useNotification({
    isError: false, // Don't use default error notification
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
