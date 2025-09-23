import { fr } from '@codegouvfr/react-dsfr';
import Alert from '@codegouvfr/react-dsfr/Alert';
import { Box, Stack, Typography } from '@mui/material';
import AppLink from '~/components/_app/AppLink/AppLink';

import AccountForm from '~/components/Account/AccountForm';
import LabelNext from '~/components/Label/LabelNext';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useUser } from '~/hooks/useUser';
import { useGetUserAccountQuery } from '~/services/user-account.service';

const AccountView = () => {
  useDocumentTitle('Gérer mon profil');

  const { user } = useUser();

  const { data: userAccount } = useGetUserAccountQuery();

  if (!user || !userAccount) {
    return <></>;
  }

  return (
    <Stack component="section" spacing="1.5rem">
      <Box>
        <Typography component="h1" variant="h3" sx={{ mb: '0.5rem' }}>
          Gérer mon profil
        </Typography>
        <Typography>
          Renseignez vos informations afin de permettre aux autres utilisateurs
          de votre territoire de vous identifier ou de vous contacter.
        </Typography>
      </Box>

      <Stack spacing="0.75rem">
        <Box>
          <LabelNext sx={{ fontWeight: '700', lineHeight: '1.5rem' }}>
            <span
              className={fr.cx('fr-icon-mail-line', 'fr-icon--sm')}
              style={{ marginRight: '0.25rem' }}
              aria-hidden={true}
            />
            Adresse e-mail de connexion
          </LabelNext>
          <Typography>{user.email}</Typography>
        </Box>

        <Alert
          severity="info"
          description={
            <>
              Pour changer d’adresse mail de connexion, rattachez votre nouvelle
              adresse mail à votre structure via{' '}
              <AppLink
                to="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
                target="_blank"
                rel="noopener noreferrer"
              >
                le portail Données foncières du Cerema
              </AppLink>
              &nbsp;puis créez un nouveau compte ZLV depuis la page d’accueil
              avec votre nouvelle adresse mail.
            </>
          }
          small
          closable={false}
        />
      </Stack>

      <AccountForm user={user} userAccount={userAccount} />
    </Stack>
  );
};

export default AccountView;
