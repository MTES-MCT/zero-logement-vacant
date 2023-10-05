import { Col, Container, Row, Text, Title } from '../../components/_dsfr/index';
import React from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useUser } from '../../hooks/useUser';
import { useGetUserAccountQuery } from '../../services/user-account.service';
import AccountSideMenu from './AccountSideMenu';
import AccountForm from './AccountForm';
import Card from '@codegouvfr/react-dsfr/Card';

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
              border={false}
              size="small"
              className="fr-px-3w fr-py-2w"
              title={
                <Title as="h1" look="h4" spacing="mb-0">
                  Gérer votre profil
                </Title>
              }
              desc={
                <div>
                  <Text as="p" size="lg" className="subtitle">
                    Renseignez vos informations afin de permettre aux autres
                    utilisateurs de votre territoire de vous identifier ou de
                    vous contacter.
                  </Text>
                  <AccountForm user={user} userAccount={userAccount} />
                </div>
              }
            ></Card>
          </Col>
        </Row>
      </Container>
    </Container>
  );
};

export default AccountView;
