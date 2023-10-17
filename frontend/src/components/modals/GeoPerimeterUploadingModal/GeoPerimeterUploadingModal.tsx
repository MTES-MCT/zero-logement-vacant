import React, { useState } from 'react';
import {
  Col,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
} from '../../_dsfr';
import * as yup from 'yup';
import { fileValidator, useForm } from '../../../hooks/useForm';
import AppHelp from '../../_app/AppHelp/AppHelp';
import styles from './geo-perimeter-uploading-modal.module.scss';
import Button from '@codegouvfr/react-dsfr/Button';
import { Upload } from '@codegouvfr/react-dsfr/Upload';

interface Props {
  onSubmit: (file: File) => void;
  onClose: () => void;
}

const GeoPerimeterUploadingModal = ({ onSubmit, onClose }: Props) => {
  const FileTypes = ['application/zip', 'application/x-zip-compressed'];
  const [file, setFile] = useState<File | undefined>();

  const schema = yup.object().shape({ file: fileValidator(FileTypes) });

  const { isValid, message, validate } = useForm(schema, {
    file,
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
    <Modal size="lg" isOpen={true} hide={() => onClose()}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        Déposer un périmètre
      </ModalTitle>
      <ModalContent>
        <AppHelp className={styles.help}>
          Pour utiliser le filtre “Périmètre” dans la base de données, vous
          pouvez déposer le ou les périmètres géographiques* qui vous
          intéressent : il peut s’agir d’un périmètre correspondant à un
          dispositif de type OPAH ou ORT, mais également d’un quartier en
          particulier, selon vos besoins.
        </AppHelp>
        <Row spacing="my-2w">
          <Col n="8">
            <Upload
              nativeInputProps={{ onChange: (event: any) => selectFile(event) }}
              multiple={false}
              label="Ajouter un fichier"
              hint="*fichier géographique (SIG) au format .zip comprenant l'ensemble des extensions qui constituent le fichier (.cpg, .dbf, .shp, etc.).”. "
              stateRelatedMessage={message('file')}
            />
          </Col>
        </Row>
      </ModalContent>
      <ModalFooter>
        <Button
          title="Annuler"
          priority="secondary"
          className="fr-mr-2w"
          onClick={onClose}
        >
          Annuler
        </Button>
        <Button title="Enregistrer" onClick={submitFile}>
          Enregistrer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default GeoPerimeterUploadingModal;
