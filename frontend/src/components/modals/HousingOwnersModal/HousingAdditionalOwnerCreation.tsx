import React, { useEffect, useState } from 'react';
import { Col, Container, Row, Text } from '../../_dsfr';
import { Owner } from '../../../models/Owner';
import * as yup from 'yup';
import {
  birthDateValidator,
  emailValidator,
  useForm,
} from '../../../hooks/useForm';
import { parseDateInput } from '../../../utils/dateUtils';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { useCreateOwnerMutation } from '../../../services/owner.service';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';

interface Props {
  onAdd: (owner: Owner) => void;
  onCancel: () => void;
}

const HousingAdditionalOwnerCreation = ({ onAdd, onCancel }: Props) => {
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [rawAddress, setRawAddress] = useState<string[] | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const shape = {
    fullName: yup.string().required("Veuillez saisir l'identité"),
    birthDate: birthDateValidator,
    rawAddress: yup.array().nullable(),
    email: emailValidator.nullable().notRequired(),
    phone: yup.string().nullable().notRequired(),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    fullName,
    birthDate,
    rawAddress,
    email,
    phone,
  });

  const [createOwner, { data: owner, isError: isCreateError }] =
    useCreateOwnerMutation();
  const submit = async () => {
    await form.validate(() => {
      createOwner({
        fullName,
        birthDate: parseDateInput(birthDate),
        rawAddress: rawAddress ?? [],
        email,
        phone,
      });
    });
  };

  useEffect(() => {
    if (owner) {
      onAdd(owner);
    }
  }, [owner]); //eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Container as="section">
      <Text size="lg">
        <b>Créer un nouveau propriétaire</b>
      </Text>
      <AppTextInput<FormShape>
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
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
            onChange={(e) => setBirthDate(e.target.value)}
            label="Date de naissance"
            inputForm={form}
            inputKey="birthDate"
          />
        </Col>
      </Row>
      <AppTextInput<FormShape>
        textArea
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

      {isCreateError && (
        <Row spacing="pt-3w">
          <Alert
            severity="error"
            description="Une erreur s'est produite, veuillez réessayer."
            closable
            small
            className="fr-mb-2w"
          />
        </Row>
      )}
      <Row spacing="pt-3w">
        <Col>
          <Button onClick={submit}>Ajouter</Button>
        </Col>
      </Row>
    </Container>
  );
};

export default HousingAdditionalOwnerCreation;
