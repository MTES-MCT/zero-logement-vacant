import React, { ChangeEvent, useState } from 'react';
import { Button, Col, Container, Row, Text } from '@dataesr/react-dsfr';
import { DraftOwner } from '../../../models/Owner';
import * as yup from 'yup';
import { dateValidator, emailValidator, useForm } from '../../../hooks/useForm';
import { parseDateInput } from '../../../utils/dateUtils';
import AppTextInput from '../../AppTextInput/AppTextInput';

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

  const shape = {
    fullName: yup.string().required("Veuillez saisir l'identité"),
    birthDate: dateValidator,
    rawAddress: yup.array().nullable(),
    email: emailValidator.notRequired(),
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
    await form.validate(() =>
      onSubmit({
        fullName,
        birthDate: parseDateInput(birthDate),
        rawAddress: rawAddress ?? [],
        email,
        phone,
      })
    );
  };

  return (
    <Container as="section">
      <Text size="lg">
        <b>Créer un nouveau propriétaire</b>
      </Text>
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
      <Row gutters={true}>
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
      </Row>
      <AppTextInput<FormShape>
        textarea
        value={rawAddress?.join('\n')}
        onChange={(e) => setRawAddress(e.target.value.split('\n'))}
        label="Adresse postale"
        inputForm={form}
        inputKey="rawAddress"
        rows={3}
      />
      <Row gutters={true}>
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
