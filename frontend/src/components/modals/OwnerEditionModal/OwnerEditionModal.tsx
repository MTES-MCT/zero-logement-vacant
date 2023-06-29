import React, { ChangeEvent, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
} from '@dataesr/react-dsfr';
import { Owner } from '../../../models/Owner';

import * as yup from 'yup';
import { format } from 'date-fns';
import { parseDateInput } from '../../../utils/dateUtils';
import { dateValidator, emailValidator, useForm } from '../../../hooks/useForm';
import AppTextInput from '../../AppTextInput/AppTextInput';
import { useUpdateOwnerMutation } from '../../../services/owner.service';

interface Props {
  owner: Owner;
  onClose: () => void;
}

const OwnerEditionModal = ({ owner, onClose }: Props) => {
  const [fullName, setFullName] = useState(owner?.fullName ?? '');
  const [birthDate, setBirthDate] = useState(
    owner?.birthDate ? format(owner.birthDate, 'yyyy-MM-dd') : ''
  );
  const [rawAddress, setRawAddress] = useState<string[]>(
    owner?.rawAddress ?? []
  );
  const [email, setEmail] = useState(owner?.email);
  const [phone, setPhone] = useState(owner?.phone);

  const [updateOwner, { isError: isUpdateError }] = useUpdateOwnerMutation();

  const shape = {
    fullName: yup.string().required("Veuillez saisir l'identité"),
    birthDate: dateValidator,
    rawAddress: yup.array().nullable(),
    email: emailValidator.nullable().notRequired(),
    phone: yup.string().nullable(),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    fullName,
    birthDate,
    rawAddress,
    email,
    phone,
  });
  const submit = async () => {
    await form.validate(() => {
      if (owner) {
        updateOwner({
          ...owner,
          fullName,
          birthDate: parseDateInput(birthDate),
          rawAddress,
          email,
          phone,
        });
        onClose();
      }
    });
  };

  return (
    <Modal isOpen={true} hide={() => onClose()} size="lg">
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>Modifier la rubrique "propriétaire"</ModalTitle>
      <ModalContent>
        <Row gutters>
          <Col n="6">
            <AppTextInput<FormShape>
              value={fullName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFullName(e.target.value)
              }
              label="Identité (nom, prénom) (obligatoire)"
              inputForm={form}
              inputKey="fullName"
              required
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              value={birthDate}
              type="date"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setBirthDate(e.target.value)
              }
              label="Date de naissance"
              inputForm={form}
              inputKey="birthDate"
            />
          </Col>
          <Col n="12">
            <AppTextInput<FormShape>
              textarea
              value={rawAddress.join('\n')}
              onChange={(e) => setRawAddress(e.target.value.split('\n'))}
              label="Adresse postale"
              inputForm={form}
              inputKey="rawAddress"
              rows={3}
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              value={email}
              type="text"
              onChange={(e) => setEmail(e.target.value)}
              label="Adresse mail"
              inputForm={form}
              inputKey="email"
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              label="Numéro de téléphone"
              inputForm={form}
              inputKey="phone"
            />
          </Col>
        </Row>
      </ModalContent>
      <ModalFooter>
        {isUpdateError && (
          <Alert
            type="error"
            description="Une erreur s'est produite, veuillez réessayer."
            closable
            className="fr-mb-2w"
          />
        )}
        <Button
          title="Annuler"
          secondary
          className="fr-mr-2w"
          onClick={() => onClose()}
        >
          Annuler
        </Button>
        <Button
          title="Enregistrer"
          onClick={() => submit()}
          data-testid="create-button"
        >
          Enregistrer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default OwnerEditionModal;
