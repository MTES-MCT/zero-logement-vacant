import { ChangeEvent, useState } from 'react';
import { Col, Row } from '../../components/_dsfr';
import * as yup from 'yup';
import { emailValidator, useForm } from '../../hooks/useForm';
import { OwnerProspect } from '../../models/OwnerProspect';
import { AddressSearchResult } from '../../services/address.service';
import AddressSearchableSelect from '../../components/AddressSearchableSelect/AddressSearchableSelect';
import styles from './home.module.scss';
import AppTextInput from '../../components/_app/AppTextInput/AppTextInput';
import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import AppCheckbox from '../../components/_app/AppCheckbox/AppCheckbox';

interface Props {
  addressSearchResult?: AddressSearchResult;
  onCreateOwnerProspect: (ownerProspect: OwnerProspect) => void;
}

const OwnerProspectForm = ({
  addressSearchResult,
  onCreateOwnerProspect,
}: Props) => {
  const [address, setAddress] = useState(addressSearchResult?.label ?? '');
  const [geoCode, setGeoCode] = useState(addressSearchResult?.postalCode ?? '');
  const [invariant, setInvariant] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [agreement, setAgreement] = useState(false);
  const [editAddress, setEditAddress] = useState(false);

  const shape = {
    address: yup.string().required('Veuillez renseigner votre adresse.'),
    invariant: yup.string(),
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
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    address,
    invariant,
    firstName,
    lastName,
    email,
    phone,
    notes,
    agreement,
  });

  const submitForm = async () => {
    await form.validate(() =>
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
        read: false,
      }),
    );
  };

  const onSelectAddress = (addressSearchResult: AddressSearchResult) => {
    setAddress(addressSearchResult.label);
    setGeoCode(addressSearchResult.postalCode);
  };

  return (
    <form id="prospect_form">
      <Row gutters>
        <Col>
          {addressSearchResult && !editAddress ? (
            <>
              <Input
                nativeInputProps={{ value: addressSearchResult.label }}
                label="Adresse de votre logement vacant"
                disabled
                className={styles.editableInput}
              />
              <Button
                iconId="fr-icon-edit-fill"
                priority="secondary"
                onClick={() => setEditAddress(true)}
                title="Modifier l'adresse"
              />
            </>
          ) : (
            <AddressSearchableSelect onSelectAddress={onSelectAddress} />
          )}
          {form.messageType('address') === 'error' && (
            <div className="fr-error-text fr-mt-0 fr-mb-2w">
              {form.message('address')}
            </div>
          )}
        </Col>
      </Row>
      <Row gutters>
        <Col>
          <AppTextInput<FormShape>
            value={invariant}
            onChange={(e) => setInvariant(e.target.value)}
            inputForm={form}
            inputKey="invariant"
            label="Invariant fiscal"
            placeholder="ex : I9904012457A"
          />
        </Col>
      </Row>
      <Row gutters>
        <Col>
          <AppTextInput<FormShape>
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            inputForm={form}
            inputKey="lastName"
            label="Nom (obligatoire)"
            required
          />
        </Col>
        <Col>
          <AppTextInput<FormShape>
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            inputForm={form}
            inputKey="firstName"
            label="Prénom (obligatoire)"
            required
          />
        </Col>
      </Row>
      <Row gutters>
        <Col>
          <AppTextInput<FormShape>
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputForm={form}
            inputKey="email"
            label="Email (obligatoire)"
            required
          />
        </Col>
        <Col>
          <AppTextInput<FormShape>
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputForm={form}
            inputKey="phone"
            label="Téléphone (obligatoire)"
            required
          />
        </Col>
      </Row>
      <Row gutters>
        <Col>
          <AppTextInput<FormShape>
            textArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            inputForm={form}
            inputKey="notes"
            label="Notes"
            rows={2}
          />
        </Col>
      </Row>
      <Row gutters>
        <Col>
          <AppCheckbox
            label="J’accepte les Conditions Générales d’Utilisation du service et d’être recontacté.e dans le cadre d’une mission d’intérêt général"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setAgreement(e.target.checked)
            }
            checked={agreement}
            state={form.messageType('agreement')}
            stateRelatedMessage={form.message('agreement')}
          />
        </Col>
      </Row>
      <Row gutters spacing="mt-2w">
        <Col>
          <Button title="Envoyer" onClick={submitForm}>
            Envoyer
          </Button>
        </Col>
      </Row>
    </form>
  );
};

export default OwnerProspectForm;
