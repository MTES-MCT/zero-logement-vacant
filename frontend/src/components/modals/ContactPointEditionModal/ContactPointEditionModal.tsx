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
  SearchableSelect,
  TextInput,
} from '@dataesr/react-dsfr';

import * as yup from 'yup';
import { ContactPoint, DraftContactPoint } from '../../../models/ContactPoint';
import { emailValidator, useForm } from '../../../hooks/useForm';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../../store/reducers/applicationReducers';

interface Props {
  contactPoint?: ContactPoint;
  onSubmit: (contactPoint: DraftContactPoint | ContactPoint) => void;
  onClose: () => void;
}

const ContactPointEditionModal = ({
  contactPoint,
  onSubmit,
  onClose,
}: Props) => {
  const [title, setTitle] = useState(contactPoint?.title ?? '');
  const [opening, setOpening] = useState(contactPoint?.opening ?? undefined);
  const [address, setAddress] = useState(contactPoint?.address ?? undefined);
  const [geoCode, setGeoCode] = useState(contactPoint?.geoCode ?? undefined);
  const [email, setEmail] = useState(contactPoint?.email ?? undefined);
  const [phone, setPhone] = useState(contactPoint?.phone ?? undefined);
  const [notes, setNotes] = useState(contactPoint?.notes ?? undefined);
  const { localities } = useSelector(
    (state: ApplicationState) => state.authentication.authUser.establishment
  );

  const schema = yup.object().shape({
    title: yup.string().required('Veuillez saisir le titre du guichet'),
    email: emailValidator.nullable().optional(),
  });

  const { isValid, message, messageType } = useForm(schema, {
    title,
    opening,
    address,
    geoCode,
    email,
    phone,
    notes,
  });

  const submitContactPointForm = () => {
    if (isValid()) {
      onSubmit({
        ...(contactPoint?.id ? { id: contactPoint.id } : {}),
        title: title!,
        opening,
        address,
        geoCode,
        email,
        phone,
        notes,
      });
    }
  };

  return (
    <Modal isOpen={true} hide={() => onClose()}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        {contactPoint?.id
          ? 'Modifier le guichet contact'
          : 'Ajouter un guichet contact'}
      </ModalTitle>
      <ModalContent>
        <Container as="section" fluid>
          <form id="user_form">
            <Row spacing="my-2w">
              <Col>
                <TextInput
                  value={title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setTitle(e.target.value)
                  }
                  messageType={messageType('title')}
                  message={message('title')}
                  label="Titre du guichet : "
                  required
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col>
                <TextInput
                  textarea
                  value={opening}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setOpening(e.target.value)
                  }
                  messageType={messageType('opening')}
                  message={message('opening')}
                  label="Horaires et jours d’ouverture : "
                  rows={2}
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col>
                <TextInput
                  textarea
                  value={address}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setAddress(e.target.value)
                  }
                  messageType={messageType('address')}
                  message={message('address')}
                  label="Adresse postale : "
                  rows={3}
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col>
                <SearchableSelect
                  options={localities.map((locality) => ({
                    value: locality.geoCode,
                    label: locality.name,
                  }))}
                  label="Commune"
                  placeholder="Rechercher une commune"
                  onChange={(value: string) => setGeoCode(value)}
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col n="6">
                <TextInput
                  value={phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPhone(e.target.value)
                  }
                  messageType={messageType('phone')}
                  message={message('phone')}
                  label="Téléphone : "
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col>
                <TextInput
                  value={email}
                  type="email"
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  messageType={messageType('email')}
                  message={message('email')}
                  label="Adresse email : "
                />
              </Col>
            </Row>
            <Row spacing="my-2w">
              <Col>
                <TextInput
                  textarea
                  value={notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setNotes(e.target.value)
                  }
                  label="Notes"
                  messageType={messageType('notes')}
                  message={message('notes')}
                  rows={3}
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
        <Button title="Enregistrer" onClick={() => submitContactPointForm()}>
          Enregistrer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ContactPointEditionModal;
