import React, { ChangeEvent, useState } from 'react';
import {
  Button,
  Col,
  Container,
  Row,
  Text,
  TextInput,
} from '@dataesr/react-dsfr';
import { DraftOwner } from '../../../models/Owner';
import * as yup from 'yup';
import { dateValidator, emailValidator, useForm } from '../../../hooks/useForm';
import { parseDateInput } from '../../../utils/dateUtils';

interface Props {
  onSubmit: (draftOwner: DraftOwner) => void;
  onCancel: () => void;
}

const HousingAdditionalOwnerCreation = ({ onSubmit, onCancel }: Props) => {
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [rawAddress, setRawAddress] = useState<string[] | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const schema = yup.object().shape({
    fullName: yup.string().required("Veuillez saisir l'identité"),
    birthDate: dateValidator,
    email: emailValidator.notRequired(),
  });

  const { message, messageType, validate, isValid } = useForm(schema, {
    fullName,
    birthDate,
    rawAddress,
    email,
    phone,
  });

  const submit = () => {
    validate().then(() => {
      if (isValid()) {
        onSubmit({
          fullName,
          birthDate: parseDateInput(birthDate),
          rawAddress: rawAddress ?? [],
          email,
          phone,
        });
      }
    });
  };

  return (
    <Container as="section">
      <Text size="lg">
        <b>Créer un nouveau propriétaire</b>
      </Text>
      <TextInput
        value={fullName}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setFullName(e.target.value)
        }
        label="Identité (nom, prénom)"
        messageType={messageType('fullName')}
        message={message('fullName')}
        required
      />
      <Row gutters={true}>
        <Col n="6">
          <TextInput
            value={birthDate}
            type="date"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setBirthDate(e.target.value)
            }
            label="Date de naissance"
            messageType={messageType('birthDate')}
            message={message('birthDate')}
          />
        </Col>
      </Row>
      <TextInput
        textarea
        value={rawAddress?.join('\n')}
        onChange={(e) => setRawAddress(e.target.value.split('\n'))}
        label="Adresse postale"
        messageType={messageType('rawAddress')}
        message={message('rawAddress')}
        rows={3}
      />
      <Row gutters={true}>
        <Col n="6">
          <TextInput
            value={email}
            type="text"
            onChange={(e) => setEmail(e.target.value)}
            label="Adresse mail"
            messageType={messageType('email')}
            message={message('email')}
          />
        </Col>
        <Col n="6">
          <TextInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            label="Numéro de téléphone"
            messageType={messageType('phone')}
            message={message('phone')}
          />
        </Col>
      </Row>
      <Row spacing="pt-3w">
        <Button
          title="Annuler"
          secondary
          className="fr-mr-2w"
          onClick={() => onCancel()}
        >
          Annuler
        </Button>
        <Button title="Enregistrer" onClick={submit}>
          Enregistrer
        </Button>
      </Row>
    </Container>
  );
};

export default HousingAdditionalOwnerCreation;
