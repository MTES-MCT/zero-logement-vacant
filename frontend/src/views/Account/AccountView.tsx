import {
  Button,
  Card,
  CardDescription,
  CardTitle,
  Col,
  Container,
  Row,
  Select,
  Text,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useUser } from '../../hooks/useUser';
import Help from '../../components/Help/Help';
import * as yup from 'yup';
import { useForm } from '../../hooks/useForm';
import { DefaultOption, SelectOption } from '../../models/SelectOption';
import InternalLink from '../../components/InternalLink/InternalLink';
import {
  useGetUserAccountQuery,
  useUpdateUserAccountMutation,
} from '../../services/user-account.service';
import Alert from '../../components/Alert/Alert';
import AccountSideMenu from './AccountSideMenu';

const AccountView = () => {
  useDocumentTitle('Votre profil');

  const { user } = useUser();

  const { data: userAccount } = useGetUserAccountQuery();

  const [
    updateUserAccount,
    { isSuccess: isUpdateSuccess, isError: isUpdateError },
  ] = useUpdateUserAccountMutation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [timePerWeek, setTimePerWeek] = useState('');

  useEffect(() => {
    if (userAccount) {
      setFirstName(userAccount.firstName ?? '');
      setLastName(userAccount.lastName ?? '');
      setPhone(userAccount.phone ?? '');
      setPosition(userAccount.position ?? '');
      setTimePerWeek(userAccount.timePerWeek ?? '');
    }
  }, [userAccount]);

  const schema = yup.object().shape({
    firstName: yup.string().required('Veuillez renseigner votre prénom.'),
    lastName: yup.string().required('Veuillez renseigner votre nom.'),
    phone: yup.string().required('Veuillez renseigner votre téléphone.'),
    position: yup.string().required('Veuillez renseigner votre poste.'),
    timePerWeek: yup
      .string()
      .required('Veuillez renseigner le temps dédié à la vacance.'),
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

  if (!user) {
    return <></>;
  }

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
    <Container as="main" className="bg-100" fluid>
      <Container as="section">
        <Row alignItems="top" gutters spacing="mt-3w mb-0">
          <Col n="4">
            <AccountSideMenu />
          </Col>
          <Col n="8">
            <Card hasArrow={false} hasBorder={false} size="sm">
              <CardTitle>
                <Title as="h1" look="h4" spacing="mb-0">
                  Gérer votre profil
                </Title>
              </CardTitle>
              <CardDescription>
                <Text as="p" size="lg" className="subtitle">
                  Renseignez vos informations afin de permettre aux autres
                  utilisateurs de votre territoire de vous identifier ou de vous
                  contacter.
                </Text>
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
                          <b>rattachez votre nouvelle adresse mail</b> à votre
                          structure via le portail Consultdf puis 
                          <b>créez un nouveau compte ZLV</b>  depuis la page
                          d'accueil avec votre nouvelle adresse mail
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
                        required
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
                        required
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
                        required
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
                        messageType={messageType('position')}
                        message={message('position')}
                        required
                      />
                    </Col>
                    <Col n="6">
                      <Select
                        label="Temps par semaine dédié à la vacance"
                        options={timePerWeekOptions}
                        selected={timePerWeek}
                        messageType={
                          messageType('timePerWeek') as 'valid' | 'error'
                        }
                        message={message('timePerWeek')}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          setTimePerWeek(e.target.value)
                        }
                        required
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
              </CardDescription>
            </Card>
          </Col>
        </Row>
      </Container>
    </Container>
  );
};

export default AccountView;
