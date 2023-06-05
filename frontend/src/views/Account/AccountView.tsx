import {
  Card,
  CardDescription,
  CardTitle,
  Col,
  Container,
  Row,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import React from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useUser } from '../../hooks/useUser';
import { useGetUserAccountQuery } from '../../services/user-account.service';
import AccountSideMenu from './AccountSideMenu';
import AccountForm from './AccountForm';

const AccountView = () => {
  useDocumentTitle('Votre profil');

  const { user } = useUser();

  const { data: userAccount } = useGetUserAccountQuery();

  if (!user || !userAccount) {
    return <></>;
  }

  return (
    <Container as="main" className="bg-100" fluid>
      <Container as="section">
        <Row alignItems="top" gutters spacing="mt-3w mb-0">
          <Col n="4">
            <AccountSideMenu />
          </Col>
          <Col n="8">
            <Card
              hasArrow={false}
              hasBorder={false}
              size="sm"
              className="fr-px-3w fr-py-2w"
            >
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
                <AccountForm user={user} userAccount={userAccount} />
              </CardDescription>
            </Card>
          </Col>
        </Row>
      </Container>
    </Container>
  );
};

export default AccountView;
