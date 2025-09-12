import { Upload } from '@codegouvfr/react-dsfr/Upload';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import * as yup from 'yup';

import { fileValidator, useForm } from '../../../hooks/useForm';
import AppHelp from '../../_app/AppHelp/AppHelp';
import { createConfirmationModal } from '../ConfirmationModal/ConfirmationModalNext';
import styles from './geo-perimeter-uploading-modal.module.scss';

export interface GeoPerimeterUploadingModalProps {
  onClose(): void;
  onSubmit(file: File): void;
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
          <Text size="lg">
          Déposer un ou plusieurs périmètres géographiques (dispositif OPAH/ORT, quartier spécifique, zonage, etc.) permet d’utiliser le filtre « Périmètre » pour cibler vos recherches.
          </Text>
            <Grid container>
            <Grid size={8}>
              <Upload
                nativeInputProps={{
                  onChange: (event: any) => selectFile(event)
                }}
                multiple={false}
                label="Ajouter un fichier"
                hint="*fichier géographique (SIG) au format .zip comprenant l'ensemble des extensions qui constituent le fichier (.cpg, .dbf, .shp, etc.).”. "
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
