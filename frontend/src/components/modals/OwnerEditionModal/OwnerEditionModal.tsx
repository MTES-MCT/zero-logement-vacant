import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Typography } from '@mui/material';
import { useState } from 'react';

import * as yup from 'yup';
import {
  banAddressValidator,
  birthDateValidator,
  emailValidator,
  useForm
} from '../../../hooks/useForm';
import { useUser } from '../../../hooks/useUser';
import { type Owner } from '../../../models/Owner';
import { useUpdateOwnerMutation } from '../../../services/owner.service';
import { parseDateInput } from '../../../utils/dateUtils';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { Col, Row } from '../../_dsfr';
import OwnerAddressEdition from '../../OwnerAddressEdition/OwnerAddressEdition';

const modal = createModal({
  id: 'owner-edition-modal',
  isOpenedByDefault: false
});

interface Props {
  owner: Owner;
  onCancel?: () => void;
}

const OwnerEditionModal = ({ owner, onCancel }: Props) => {
  const { isVisitor } = useUser();
  const [fullName, setFullName] = useState(owner?.fullName ?? '');
  const [birthDate, setBirthDate] = useState(owner?.birthDate ?? '');
  const [banAddress, setBanAddress] = useState(owner?.banAddress);
  const [email, setEmail] = useState(owner?.email);
  const [phone, setPhone] = useState(owner?.phone);
  const [additionalAddress, setAdditionalAddress] = useState(
    owner?.additionalAddress
  );

  const storedWarningVisible = localStorage.getItem(
    'OwnerEdition.warningVisible'
  );
  const [warningVisible, setWarningVisible] = useState(
    storedWarningVisible === null || storedWarningVisible === 'true'
  );

  const [updateOwner, { isError: isUpdateError }] = useUpdateOwnerMutation();

  const shape = {
    fullName: yup.string().required("Veuillez saisir l'identité"),
    birthDate: birthDateValidator,
    banAddress: banAddressValidator,
    email: emailValidator.nullable().notRequired(),
    phone: yup.string().nullable(),
    additionalAddress: yup.string().nullable().notRequired()
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    fullName,
    birthDate,
    banAddress,
    email,
    phone,
    additionalAddress
  });
  const submit = async () => {
    await form.validate(() => {
      if (owner) {
        updateOwner({
          ...owner,
          fullName,
          birthDate: parseDateInput(birthDate)?.toJSON() ?? null,
          banAddress: banAddress ?? null,
          email,
          phone,
          additionalAddress
        });
        modal.close();
      }
    });
  };

  return (
    <>
      {!isVisitor && (
        <Button
          iconId="fr-icon-edit-fill"
          priority="tertiary no outline"
          title="Modifier le propriétaire"
          onClick={modal.open}
        >
          Modifier
        </Button>
      )}
      <modal.Component
        size="large"
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w',
            onClick: onCancel
          },
          {
            children: 'Enregistrer',
            onClick: submit,
            doClosesModal: false
          }
        ]}
        title='Modifier la rubrique "propriétaire"'
        style={{ textAlign: 'initial', fontWeight: 'initial' }}
      >
        <Row gutters>
          <Col n="6">
            <AppTextInput<FormShape>
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              label="Nom et prénom (obligatoire)"
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
            <Typography
              component="h3"
              color={fr.colors.decisions.text.active.grey.default}
            >
              <span
                className={fr.cx(
                  'fr-icon-bank-line',
                  'fr-icon--sm',
                  'fr-mr-1w'
                )}
                aria-hidden={true}
              />
              Adresse fiscale (source: DGFIP)
            </Typography>
            <span className="fr-hint-text">
              Cette adresse est issue du fichier LOVAC, récupérée via le fichier
              1767BIS-COM. Celle-ci n’est pas modifiable.
            </span>
            <Typography color={fr.colors.decisions.text.default.grey.default}>
              {owner.rawAddress ? owner.rawAddress.join(' ') : 'Inconnue'}
            </Typography>
          </Col>
          <Col n="12">
            <Typography
              component="h3"
              color={fr.colors.decisions.text.active.grey.default}
            >
              <span
                className={fr.cx(
                  'fr-icon-home-4-line',
                  'fr-icon--sm',
                  'fr-mr-1w'
                )}
                aria-hidden={true}
              />
              Adresse postale (source: Base Adresse Nationale)
            </Typography>
            <OwnerAddressEdition
              banAddress={owner.banAddress}
              onSelectAddress={(a) => setBanAddress(a ?? null)}
              errorMessage={form.message('banAddress')}
              warningVisible={warningVisible}
              setWarningVisible={setWarningVisible}
            />
          </Col>
          <Col n="12">
            <AppTextInput<FormShape>
              value={additionalAddress ?? undefined}
              onChange={(e) => setAdditionalAddress(e.target.value)}
              label="Complément d'adresse"
              inputForm={form}
              inputKey="additionalAddress"
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              value={email ?? undefined}
              type="text"
              onChange={(e) => setEmail(e.target.value)}
              label="Adresse mail"
              inputForm={form}
              inputKey="email"
            />
          </Col>
          <Col n="6">
            <AppTextInput<FormShape>
              value={phone ?? undefined}
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
