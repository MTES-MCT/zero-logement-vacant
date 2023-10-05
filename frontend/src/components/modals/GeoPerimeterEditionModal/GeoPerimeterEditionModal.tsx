import React, { useState } from 'react';
import {
  Col,
  Container,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
} from '../../../components/dsfr/index';

import * as yup from 'yup';
import { GeoPerimeter } from '../../../models/GeoPerimeter';
import { useForm } from '../../../hooks/useForm';
import AppTextInput from '../../AppTextInput/AppTextInput';
import Button from '@codegouvfr/react-dsfr/Button';

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

  const shape = {
    name: yup.string().required('Veuillez saisir le nom du périmètre'),
    kind: yup.string().required('Veuillez saisir le nom filtre'),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    name,
    kind,
  });

  const submitPerimeterForm = async () => {
    await form.validate(() => onSubmit(kind, name));
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
          <form id="geo_perimeter_form">
            <Row spacing="mb-2w">
              <Col>
                <AppTextInput<FormShape>
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  inputForm={form}
                  inputKey="name"
                  label="Nom du périmètre (obligatoire)"
                  required
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <AppTextInput<FormShape>
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  inputForm={form}
                  inputKey="kind"
                  label="Nom du filtre (obligatoire)"
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
          priority="secondary"
          className="fr-mr-2w"
          onClick={onClose}
        >
          Annuler
        </Button>
        <Button title="Enregistrer" onClick={submitPerimeterForm}>
          Enregistrer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default GeoPerimeterEditionModal;
