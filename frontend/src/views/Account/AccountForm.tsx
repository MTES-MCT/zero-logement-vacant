import { Button, Col, Row, Select, TextInput } from '@dataesr/react-dsfr';
import React, { ChangeEvent, useState } from 'react';
import Help from '../../components/Help/Help';
import * as yup from 'yup';
import { useForm } from '../../hooks/useForm';
import { DefaultOption, SelectOption } from '../../models/SelectOption';
import InternalLink from '../../components/InternalLink/InternalLink';
import { useUpdateUserAccountMutation } from '../../services/user-account.service';
import Alert from '../../components/Alert/Alert';
import { User, UserAccount } from '../../models/User';

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

  const schema = yup.object().shape({
    firstName: yup.string(),
    lastName: yup.string(),
    phone: yup.string(),
    position: yup.string(),
    timePerWeek: yup.string(),
  });

  const { message, messageType, validate } = useForm(
    schema,
    {
      firstName,
      lastName,
      phone,
      position,
      timePerWeek,
    },
    { disableValidationOnTouch: true }
  );

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
    await validate(() =>
      updateUserAccount({
        firstName,
        lastName,
        phone,
        position,
        timePerWeek,
      })
    );
  };

  return (
    <form id="account_form">
      <div className="fr-p-3w bg-975">
        <Row gutters>
          <Col n="6">
            <TextInput
              type="email"
              disabled
              value={user?.email}
              label="Adresse email : "
            />
          </Col>
          <Col n="6">
            <TextInput
              type="password"
              disabled
              value="********"
              label="Mot de passe : "
              className="fr-mb-1w"
            />
            <InternalLink
              to="/compte/mot-de-passe"
              icon="ri-edit-2-fill"
              iconPosition="left"
              className="fr-link"
            >
              Modifier le mot de passe
            </InternalLink>
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
          <TextInput
            value={firstName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFirstName(e.target.value)
            }
            label="Prénom"
            messageType={messageType('firstName')}
            message={message('firstName')}
          />
        </Col>
        <Col n="6">
          <TextInput
            value={lastName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setLastName(e.target.value)
            }
            label="Nom"
            messageType={messageType('lastName')}
            message={message('lastName')}
          />
        </Col>
        <Col n="6">
          <TextInput
            value={phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setPhone(e.target.value)
            }
            label="Téléphone"
            messageType={messageType('phone')}
            message={message('phone')}
          />
        </Col>
        <Col n="6"></Col>
        <Col n="6">
          <TextInput
            value={position}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setPosition(e.target.value)
            }
            label="Poste"
            placeholder="Ex : Chargé Habitat"
            messageType={messageType('position')}
            message={message('position')}
          />
        </Col>
        <Col n="6">
          <Select
            label="Temps par semaine dédié à la vacance"
            options={timePerWeekOptions}
            selected={timePerWeek}
            messageType={messageType('timePerWeek') as 'valid' | 'error'}
            message={message('timePerWeek')}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setTimePerWeek(e.target.value)
            }
          />
        </Col>
        <Col>
          {isUpdateError && (
            <Alert
              type="error"
              description="Une erreur s'est produite, veuillez réessayer."
              closable
              className="fr-mb-2w"
            />
          )}
          {isUpdateSuccess && (
            <Alert
              type="success"
              description="La mise a jour de votre profil a bien été enregistrée "
              closable
              className="fr-mb-2w"
            />
          )}
          <Button title="Enregistrer" onClick={() => submit()}>
            Enregistrer
          </Button>
        </Col>
      </Row>
    </form>
  );
};

export default AccountForm;
