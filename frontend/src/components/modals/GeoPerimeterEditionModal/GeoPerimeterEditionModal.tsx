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
import { ValidationError } from 'yup/es';
import { GeoPerimeter } from '../../../models/GeoPerimeter';

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

  const [formErrors, setFormErrors] = useState<any>({});

  const perimeterForm = yup.object().shape({
    kind: yup.string().required('Veuillez renseigner un nom de filtre.'),
  });

  const submitPerimeterForm = () => {
    setFormErrors({});
    perimeterForm
      .validate({ kind, name }, { abortEarly: false })
      .then(() => onSubmit(kind, name))
      .catch((err) => {
        const object: any = {};
        err.inner.forEach((x: ValidationError) => {
          if (x.path !== undefined && x.errors.length) {
            object[x.path] = x.errors[0];
          }
        });
        setFormErrors(object);
      });
  };

  return (
    <Modal isOpen={true} hide={() => onClose()}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        Modifier le périmètre
      </ModalTitle>
      <ModalContent>
        <Container as="section" fluid>
          <form id="user_form">
            <Row gutters>
              <Col>
                <TextInput
                  value={kind}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setKind(e.target.value)
                  }
                  messageType={formErrors['kind'] ? 'error' : ''}
                  message={formErrors['kind']}
                  label="Nom du filtre : "
                  required
                />
              </Col>
              <Col>
                <TextInput
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  label="Entité : "
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
