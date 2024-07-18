import { Col, Row, Text } from '../../components/_dsfr';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useUser } from '../../hooks/useUser';
import { useGetUserAccountQuery } from '../../services/user-account.service';
import AccountSideMenu from './AccountSideMenu';
import AccountForm from './AccountForm';
import Card from '@codegouvfr/react-dsfr/Card';
import MainContainer from '../../components/MainContainer/MainContainer';
import Typography from '@mui/material/Typography';

const AccountView = () => {
  useDocumentTitle('Votre profil');

  const { user, } = useUser();

  const { data: userAccount, } = useGetUserAccountQuery();

  if (!user || !userAccount) {
    return <></>;
  }

  return (
    <MainContainer grey>
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
              <Typography component="h1" variant="h4" mb={0}>
                Gérer votre profil
              </Typography>
            }
            desc={
              <div>
                <Text as="p" size="lg" className="subtitle">
                  Renseignez vos informations afin de permettre aux autres
                  utilisateurs de votre territoire de vous identifier ou de vous
                  contacter.
                </Text>
                <AccountForm user={user} userAccount={userAccount} />
              </div>
            }
          ></Card>
        </Col>
      </Row>
    </MainContainer>
  );
};

export default AccountView;
