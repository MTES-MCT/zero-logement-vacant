import React, { ChangeEvent, useState } from 'react';
import { Button, Checkbox, Col, Row, TextInput } from '@dataesr/react-dsfr';
import * as yup from 'yup';
import { emailValidator, useForm } from '../../hooks/useForm';
import { OwnerProspect } from '../../models/OwnerProspect';
import { AddressSearchResult } from '../../services/address.service';
import AddressSearchableSelect from '../../components/AddressSearchableSelect/AddressSearchableSelect';
import styles from './home.module.scss';

interface Props {
  addressSearchResult?: AddressSearchResult;
  onCreateOwnerProspect: (ownerProspect: OwnerProspect) => void;
}

const OwnerProspectForm = ({
  addressSearchResult,
  onCreateOwnerProspect,
}: Props) => {
  const [address, setAddress] = useState(addressSearchResult?.label ?? '');
  const [geoCode, setGeoCode] = useState(addressSearchResult?.geoCode ?? '');
  const [invariant, setInvariant] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [agreement, setAgreement] = useState(false);
  const [editAddress, setEditAddress] = useState(false);

  const schema = yup.object().shape({
    address: yup.string().required('Veuillez renseigner votre adresse.'),
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

  const { isValid, message, messageType, validate } = useForm(
    schema,
    {
      address,
      invariant,
      firstName,
      lastName,
      email,
      phone,
      notes,
      agreement,
    },
    { disableValidationOnTouch: true }
  );

  const submitForm = () => {
    validate();
    if (isValid()) {
      onCreateOwnerProspect({
        address,
        geoCode,
        invariant,
        email,
        firstName,
        lastName,
        phone,
        notes,
        callBack: true,
      });
    }
  };

  const onSelectAddress = (addressSearchResult: AddressSearchResult) => {
    setAddress(addressSearchResult.label);
    setGeoCode(addressSearchResult.geoCode);
  };

  return (
    <form id="prospect_form">
      <Row gutters>
        <Col>
          {addressSearchResult && !editAddress ? (
            <>
              <TextInput
                value={addressSearchResult.label}
                label="Adresse de votre logement vacant"
                disabled
                className={styles.editableInput}
              />
              <Button
                icon="ri-edit-fill"
                secondary
                onClick={() => setEditAddress(true)}
              />
            </>
          ) : (
            <AddressSearchableSelect onSelectAddress={onSelectAddress} />
          )}
        </Col>
      </Row>
      <Row gutters>
        <Col>
          <TextInput
            value={invariant}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setInvariant(e.target.value)
            }
            messageType={messageType('invariant')}
            message={message('invariant')}
            label="Invariant fiscal"
            placeholder="ex : I9904012457A"
          />
        </Col>
      </Row>
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
            label="Email : "
            required
          />
        </Col>
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
