import { useState } from 'react';
import { Col, Row } from '../../_dsfr';
import { Owner } from '../../../models/Owner';

import * as yup from 'yup';
import { format } from 'date-fns';
import { parseDateInput } from '../../../utils/dateUtils';
import {
  banAddressValidator,
  birthDateValidator,
  emailValidator,
  useForm
} from '../../../hooks/useForm';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { useUpdateOwnerMutation } from '../../../services/owner.service';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Button from '@codegouvfr/react-dsfr/Button';
import OwnerAddressEdition from '../../OwnerAddressEdition/OwnerAddressEdition';
import { useUser } from '../../../hooks/useUser';

const modal = createModal({
  id: 'owner-edition-modal',
  isOpenedByDefault: true,
});

interface Props {
  owner: Owner;
  onCancel?: () => void;
}

const OwnerEditionModal = ({ owner, onCancel, }: Props) => {
  const { isVisitor, } = useUser();
  const [fullName, setFullName] = useState(owner?.fullName ?? '');
  const [birthDate, setBirthDate] = useState(
    owner?.birthDate ? format(owner.birthDate, 'yyyy-MM-dd') : ''
  );
  const [banAddress, setBanAddress] = useState(owner?.banAddress);
  const [email, setEmail] = useState(owner?.email);
  const [phone, setPhone] = useState(owner?.phone);
  const [additionalAddress, setAdditionalAddress] = useState(
    owner?.additionalAddress
  );

  const [updateOwner, { isError: isUpdateError, }] = useUpdateOwnerMutation();

  const shape = {
    fullName: yup.string().required("Veuillez saisir l'identité"),
    birthDate: birthDateValidator,
    banAddress: banAddressValidator,
    email: emailValidator.nullable().notRequired(),
    phone: yup.string().nullable(),
    additionalAddress: yup.string().nullable().notRequired(),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    fullName,
    birthDate,
    banAddress,
    email,
    phone,
    additionalAddress,
  });
  const submit = async () => {
    await form.validate(() => {
      if (owner) {
        updateOwner({
          ...owner,
          fullName,
          birthDate: parseDateInput(birthDate),
          banAddress,
          email,
          phone,
          additionalAddress,
        });
        modal.close();
      }
    });
  };

  return (
    <>
      { !isVisitor && <Button
        className="float-right fr-pr-0"
        iconId="fr-icon-edit-fill"
        priority="tertiary no outline"
        title="Modifier le propriétaire"
        onClick={modal.open}
      >
        Modifier
      </Button> }
      <modal.Component
        size="large"
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w',
            onClick: onCancel,
          },
          {
            children: 'Enregistrer',
            onClick: submit,
            doClosesModal: false,
          }
        ]}
        title='Modifier la rubrique "propriétaire"'
        style={{ textAlign: 'initial', fontWeight: 'initial', }}
      >
        <Row gutters>
          <Col n="6">
            <AppTextInput<FormShape>
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
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
              onChange={(e) => setBirthDate(e.target.value)}
              label="Date de naissance"
              inputForm={form}
              inputKey="birthDate"
            />
          </Col>
          <Col n="12">
            <OwnerAddressEdition
              banAddress={owner.banAddress}
              rawAddress={owner.rawAddress}
              onSelectAddress={(a) => setBanAddress(a)}
              errorMessage={form.message('banAddress')}
            />
          </Col>
          <Col n="12">
            <AppTextInput<FormShape>
              value={additionalAddress}
              onChange={(e) => setAdditionalAddress(e.target.value)}
              label="Complément d'adresse"
              inputForm={form}
              inputKey="additionalAddress"
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
        {isUpdateError && (
          <Alert
            severity="error"
            description="Une erreur s'est produite, veuillez réessayer."
            closable
            small
            className="fr-mb-2w"
          />
        )}
      </modal.Component>
    </>
  );
};

export default OwnerEditionModal;
