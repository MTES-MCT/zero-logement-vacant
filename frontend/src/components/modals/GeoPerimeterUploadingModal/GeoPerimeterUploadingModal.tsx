import React, { useState } from 'react';
import {
  Button,
  Container,
  File,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
} from '@dataesr/react-dsfr';
import * as yup from 'yup';
import { fileValidator, useForm } from '../../../hooks/useForm';

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
    <Modal isOpen={true} hide={() => onClose()}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        Déposer un périmètre
      </ModalTitle>
      <ModalContent>
        <Container as="section" fluid>
          <File
            onChange={(event: any) => selectFile(event)}
            multiple={false}
            label="Ajouter un fichier"
            hint="Sélectionner un fichier zip uniquement qui contient un ou plusieurs périmètres"
            errorMessage={message('file')}
          />
        </Container>
      </ModalContent>
      <ModalFooter>
        <Button
          title="Annuler"
          secondary
          className="fr-mr-2w"
          onClick={() => onClose()}
        >
          Annuler
        </Button>
        <Button title="Enregistrer" onClick={() => submitFile()}>
          Enregistrer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default GeoPerimeterUploadingModal;
