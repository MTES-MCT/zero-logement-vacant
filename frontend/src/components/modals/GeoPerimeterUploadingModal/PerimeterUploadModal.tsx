import { Upload } from '@codegouvfr/react-dsfr/Upload';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import * as yup from 'yup';

import { fileValidator, useForm } from '~/hooks/useForm';
import { createConfirmationModal } from '~/components/modals/ConfirmationModal/ConfirmationModalNext';

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

      const schema = yup.object().shape({ file: fileValidator(FileTypes) });

      const { isValid, message, validate } = useForm(schema, {
        file
      });

      const selectFile = (event: any) => {
        setFile(event.target?.files?.[0]);
      };

      const submitFile = () => {
        validate().then(() => {
          if (isValid()) {
            onSubmit(file!);
          }
        });
      };

      return (
        <modal.Component
          size="large"
          title="Déposer un périmètre"
          onClose={onClose}
          onSubmit={submitFile}
          {...rest}
        >
          <Grid container spacing={2}>
            {props.error && (
              <Grid size={12}>
                <Alert
                  severity="error"
                  description={props.error}
                  closable={false}
                  small
                />
              </Grid>
            )}
            <Grid size={8}>
              <Upload
                nativeInputProps={{
                  onChange: (event: any) => selectFile(event),
                  accept: '.zip,application/zip,application/x-zip-compressed'
                }}
                multiple={false}
                label="Ajouter un fichier"
                hint="Format : fichier géographique (SIG) au format .zip comprenant l'ensemble des extensions qui constituent le fichier (.cpg, .dbf, .shp, etc.)."
                stateRelatedMessage={message('file')}
              />
            </Grid>
          </Grid>
        </modal.Component>
      );
    }
  };
}

export default createPerimeterUploadModal;
