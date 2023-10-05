import React, { useState } from 'react';
import { Col, Row } from '../../../components/dsfr/index';
import { Owner } from '../../../models/Owner';

import * as yup from 'yup';
import { format } from 'date-fns';
import { parseDateInput } from '../../../utils/dateUtils';
import { dateValidator, emailValidator, useForm } from '../../../hooks/useForm';
import AppTextInput from '../../AppTextInput/AppTextInput';
import { useUpdateOwnerMutation } from '../../../services/owner.service';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Button from '@codegouvfr/react-dsfr/Button';

const modal = createModal({
  id: 'owner-edition-modal',
  isOpenedByDefault: true,
});

interface Props {
  owner: Owner;
}

const OwnerEditionModal = ({ owner }: Props) => {
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
    birthDate: dateValidator.nullable().notRequired(),
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
        modal.close();
      }
    });
  };

  return (
    <>
      <Button
        className="float-right fr-pr-0"
        iconId="fr-icon-edit-fill"
        priority="tertiary no outline"
        title="Modifier le propriétaire"
        onClick={modal.open}
      >
        Modifier
      </Button>
      <modal.Component
        size="large"
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w',
          },
          {
            children: 'Enregistrer',
            onClick: submit,
            doClosesModal: false,
          },
        ]}
        title='Modifier la rubrique "propriétaire"'
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
            <AppTextInput<FormShape>
              textArea
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
