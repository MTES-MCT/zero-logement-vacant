import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Upload } from '@codegouvfr/react-dsfr/Upload';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import * as yup from 'yup';

import { createConfirmationModal } from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import { fileValidator } from '~/hooks/useForm';

import styles from './geo-perimeter-uploading-modal.module.scss';

export interface GeoPerimeterUploadingModalProps {
  onClose(): void;
  onSubmit(file: File): void;
  error?: string;
  isLoading?: boolean;
}

function createPerimeterUploadModal() {
  const modal = createConfirmationModal({
    id: 'perimeter-upload-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: GeoPerimeterUploadingModalProps) {
      const { onClose, onSubmit, ...rest } = props;
      const FileTypes = ['application/zip', 'application/x-zip-compressed'];
      const [file, setFile] = useState<File | undefined>();
      const [fileError, setFileError] = useState('');
      const [validationError, setValidationError] = useState('');

      const schema = yup
        .object()
        .shape({ file: fileValidator(FileTypes).default(undefined) })
        .required();

      const selectFile = (event: any) => {
        setFileError('');
        setValidationError('');
        setFile(event.target?.files?.[0]);
      };

      const submitFile = async () => {
        setFileError('');
        setValidationError('');
        try {
          await schema.validate({ file }, { abortEarly: false });
        } catch (error) {
          if (error instanceof yup.ValidationError) {
            setFileError(error.message);
            return;
          }
          setValidationError(
            'Le fichier n’a pas pu être validé. Veuillez réessayer.'
          );
          return;
        }
        onSubmit(file!);
      };

      const displayedError = props.error || validationError;
      // Check if error is file_too_large to display it differently
      const isFileTooLarge = displayedError.includes('trop volumineux');
      const shouldShowAlert = !!displayedError && !isFileTooLarge;

      return (
        <modal.Component
          size="large"
          title="Déposer un périmètre"
          onClose={onClose}
          onSubmit={submitFile}
          {...rest}
        >
          <Grid container spacing={2}>
            {shouldShowAlert && (
              <Grid size={12}>
                <Alert
                  severity="error"
                  description={displayedError}
                  closable={false}
                  small
                />
              </Grid>
            )}
            <Grid size={12}>
              <Upload
                nativeInputProps={{
                  onChange: (event: any) => selectFile(event),
                  accept: '.zip,application/zip,application/x-zip-compressed',
                  'aria-invalid': isFileTooLarge || fileError ? true : undefined
                }}
                multiple={false}
                label="Ajouter un fichier"
                hint="Format : fichier géographique (SIG) au format .zip comprenant l'ensemble des extensions qui constituent le fichier (.cpg, .dbf, .shp, etc.)."
                state={isFileTooLarge || fileError ? 'error' : 'default'}
                stateRelatedMessage={
                  isFileTooLarge ? displayedError : fileError
                }
                className={styles.upload}
              />
            </Grid>
          </Grid>
        </modal.Component>
      );
    }
  };
}

export default createPerimeterUploadModal;
