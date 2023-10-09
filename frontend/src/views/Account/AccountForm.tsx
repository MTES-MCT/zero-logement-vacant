import { Col, Row } from '../../components/_dsfr';
import React, { useState } from 'react';
import Help from '../../components/Help/Help';
import * as yup from 'yup';
import { useForm } from '../../hooks/useForm';
import { DefaultOption, SelectOption } from '../../models/SelectOption';
import AppLink from '../../components/_app/AppLink/AppLink';
import { useUpdateUserAccountMutation } from '../../services/user-account.service';
import { User, UserAccount } from '../../models/User';
import AppTextInput from '../../components/_app/AppTextInput/AppTextInput';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Input from '@codegouvfr/react-dsfr/Input';
import Button from '@codegouvfr/react-dsfr/Button';
import AppSelect from '../../components/_app/AppSelect/AppSelect';

interface Props {
  user: User;
  userAccount: UserAccount;
}

const AccountForm = ({ user, userAccount }: Props) => {
  const [
    updateUserAccount,
    { isSuccess: isUpdateSuccess, isError: isUpdateError },
  ] = useUpdateUserAccountMutation();

  const [firstName, setFirstName] = useState(userAccount.firstName ?? '');
  const [lastName, setLastName] = useState(userAccount.lastName ?? '');
  const [phone, setPhone] = useState(userAccount.phone ?? '');
  const [position, setPosition] = useState(userAccount.position ?? '');
  const [timePerWeek, setTimePerWeek] = useState(userAccount.timePerWeek ?? '');

  const shape = {
    firstName: yup.string(),
    lastName: yup.string(),
    phone: yup.string(),
    position: yup.string(),
    timePerWeek: yup.string(),
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    firstName,
    lastName,
    phone,
    position,
    timePerWeek,
  });

  const timePerWeekOptions: SelectOption[] = [
    DefaultOption,
    ...[
      'Moins de 0,5 jour',
      '0,5 jour',
      '1 jour',
      '2 jours',
      'Plus de 2 jours',
    ].map((_) => ({ value: _, label: _ })),
  ];

  const submit = async () => {
    await form.validate(() => {
      updateUserAccount({
        firstName,
        lastName,
        phone,
        position,
        timePerWeek,
      });
    });
  };

  return (
    <form id="account_form">
      <div className="fr-p-3w bg-975">
        <Row gutters>
          <Col n="6">
            <Input
              nativeInputProps={{ type: 'email', value: user?.email }}
              disabled
              label="Adresse email : "
            />
          </Col>
          <Col n="6">
            <Input
              nativeInputProps={{ type: 'password', value: '********' }}
              disabled
              label="Mot de passe : "
              className="fr-mb-1w"
            />
            <AppLink
              to="/compte/mot-de-passe"
              iconId="fr-icon-edit-fill"
              iconPosition="left"
            >
              Modifier le mot de passe
            </AppLink>
          </Col>
          <Col n="12">
            <Help>
              Pour changer d'adresse mail de connexion, 
              <b>rattachez votre nouvelle adresse mail</b>  à votre structure
              via le portail Consultdf puis 
              <b>créez un nouveau compte ZLV</b>  depuis la page d'accueil avec
              votre nouvelle adresse mail
            </Help>
          </Col>
        </Row>
      </div>
      <Row gutters spacing="pt-3w">
        <Col n="6">
          <AppTextInput<FormShape>
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            label="Prénom"
            inputForm={form}
            inputKey="firstName"
          />
        </Col>
        <Col n="6">
          <AppTextInput<FormShape>
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            label="Nom"
            inputForm={form}
            inputKey="lastName"
          />
        </Col>
        <Col n="6">
          <AppTextInput<FormShape>
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            label="Téléphone"
            inputForm={form}
            inputKey="phone"
          />
        </Col>
        <Col n="6"></Col>
        <Col n="6">
          <AppTextInput<FormShape>
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            label="Poste"
            placeholder="Ex : Chargé Habitat"
            inputForm={form}
            inputKey="position"
          />
        </Col>
        <Col n="6">
          <AppSelect<FormShape>
            label="Temps par semaine dédié à la vacance"
            onChange={(e) => setTimePerWeek(e.target.value)}
            value={timePerWeek}
            inputForm={form}
            inputKey="timePerWeek"
            options={timePerWeekOptions}
          />
        </Col>
        <Col>
          {isUpdateError && (
            <Alert
              severity="error"
              description="Une erreur s'est produite, veuillez réessayer."
              closable
              small
              className="fr-mb-2w"
            />
          )}
          {isUpdateSuccess && (
            <Alert
              severity="success"
              description="La mise a jour de votre profil a bien été enregistrée "
              closable
              small
              className="fr-mb-2w"
            />
          )}
          <Button onClick={submit}>Enregistrer</Button>
        </Col>
      </Row>
    </form>
  );
};

export default AccountForm;
