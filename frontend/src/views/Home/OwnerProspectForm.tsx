import React, { ChangeEvent, useState } from 'react';
import { Button, Checkbox, Col, Row, TextInput } from '@dataesr/react-dsfr';
import * as yup from 'yup';
import { emailValidator, useForm } from '../../hooks/useForm';
import { PartialOwnerProspect } from '../../models/OwnerProspect';

interface Props {
  onCreateOwnerProspect: (partialOwnerProspect: PartialOwnerProspect) => void;
}

const OwnerProspectForm = ({ onCreateOwnerProspect }: Props) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [agreement, setAgreement] = useState(false);

  const schema = yup.object().shape({
    firstName: yup.string().required('Veuillez renseigner votre prénom.'),
    lastName: yup.string().required('Veuillez renseigner votre nom.'),
    email: emailValidator,
    phone: yup
      .string()
      .required('Veuillez renseigner votre numéro de téléphone.'),
    notes: yup.string(),
    agreement: yup
      .boolean()
      .oneOf([true], 'Veuillez accepter les conditions générales.'),
  });

  const { isValid, message, messageType } = useForm(schema, {
    firstName,
    lastName,
    email,
    phone,
    notes,
    agreement,
  });

  const submitForm = () => {
    if (isValid()) {
      onCreateOwnerProspect({
        email,
        firstName,
        lastName,
        phone,
        notes,
      });
    }
  };

  return (
    <form id="prospect_form">
      <Row gutters>
        <Col>
          <TextInput
            value={lastName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setLastName(e.target.value)
            }
            messageType={messageType('lastName')}
            message={message('lastName')}
            label="Nom"
            required
          />
        </Col>
        <Col>
          <TextInput
            value={firstName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFirstName(e.target.value)
            }
            messageType={messageType('firstName')}
            message={message('firstName')}
            label="Prénom"
            required
          />
        </Col>
      </Row>
      <Row gutters>
        <Col>
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            messageType={messageType('email')}
            message={message('email')}
            label="Mail : "
            required
          />
        </Col>
      </Row>
      <Row gutters>
        <Col>
          <TextInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            messageType={messageType('phone')}
            message={message('phone')}
            label="Téléphone : "
            required
          />
        </Col>
      </Row>
      <Row gutters>
        <Col>
          <TextInput
            textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            messageType={messageType('notes')}
            message={message('notes')}
            label="Notes : "
            rows={2}
          />
        </Col>
      </Row>
      <Row gutters>
        <Col>
          <Checkbox
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setAgreement(e.target.checked)
            }
            checked={agreement}
            label="J’accepte les Conditions Générales d’Utilisation du service et d’être recontacté.e dans le cadre d’une mission d’intérêt général"
            messageType={messageType('agreement')}
            message={message('agreement')}
          />
        </Col>
      </Row>
      <Row gutters spacing="mt-2w">
        <Col>
          <Button title="Envoyer" onClick={() => submitForm()}>
            Envoyer
          </Button>
        </Col>
      </Row>
    </form>
  );
};

export default OwnerProspectForm;
