import React, { ChangeEvent, useState } from 'react';
import {
  Button,
  Col,
  Container,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
  TextInput,
} from '@dataesr/react-dsfr';

import * as yup from 'yup';
import { GeoPerimeter } from '../../../models/GeoPerimeter';
import { useForm } from '../../../hooks/useForm';

const GeoPerimeterEditionModal = ({
  geoPerimeter,
  onSubmit,
  onClose,
}: {
  geoPerimeter: GeoPerimeter;
  onSubmit: (kind: string, name?: string) => void;
  onClose: () => void;
}) => {
  const [kind, setKind] = useState(geoPerimeter.kind);
  const [name, setName] = useState(geoPerimeter.name);

  const schema = yup.object().shape({
    name: yup.string().required('Veuillez saisir le nom du périmètre'),
    kind: yup.string().required('Veuillez saisir le nom filtre'),
  });

  const { isValid, message, messageType } = useForm(schema, {
    name,
    kind,
  });

  const submitPerimeterForm = () => {
    if (isValid()) {
      onSubmit(kind, name);
    }
  };

  return (
    <Modal isOpen={true} hide={() => onClose()}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        Edition du périmètre
      </ModalTitle>
      <ModalContent>
        <Container as="section" fluid>
          <form id="user_form">
            <Row spacing="mb-2w">
              <Col>
                <TextInput
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  messageType={messageType('name')}
                  message={message('name')}
                  label="Nom du périmètre : "
                  required
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <TextInput
                  value={kind}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setKind(e.target.value)
                  }
                  messageType={messageType('kind')}
                  message={message('kind')}
                  label="Nom du filtre : "
                  required
                />
              </Col>
            </Row>
          </form>
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
        <Button title="Enregistrer" onClick={() => submitPerimeterForm()}>
          Enregistrer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default GeoPerimeterEditionModal;
