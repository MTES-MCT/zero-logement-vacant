import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Upload } from '@codegouvfr/react-dsfr/Upload';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import * as yup from 'yup';

import { createConfirmationModal } from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import { fileValidator, useForm } from '~/hooks/useForm';

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
      const [validationError, setValidationError] = useState('');

      const schema = yup
        .object()
        .shape({ file: fileValidator(FileTypes).default(undefined) })
        .required();

      const { message, validate } = useForm(schema as any, {
        file
      });

      const selectFile = (event: any) => {
        setValidationError('');
        setFile(event.target?.files?.[0]);
      };

      const submitFile = async () => {
        setValidationError('');
        try {
          await validate(() => onSubmit(file!));
        } catch {
          setValidationError(
            'Le fichier n’a pas pu être validé. Veuillez réessayer.'
          );
        }
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
                  accept: '.zip,application/zip,application/x-zip-compressed'
                }}
                multiple={false}
                label="Ajouter un fichier"
                hint="Format : fichier géographique (SIG) au format .zip comprenant l'ensemble des extensions qui constituent le fichier (.cpg, .dbf, .shp, etc.)."
                state={isFileTooLarge ? 'error' : 'default'}
                stateRelatedMessage={
                  isFileTooLarge ? displayedError : message('file')
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
