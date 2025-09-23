import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import { Divider } from '@mui/material';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import Dropdown from '~/components/Dropdown/Dropdown';
import { useUser } from '~/hooks/useUser';

const FIXED_WIDTH = '18.75rem';

const MutedButton = styled(Button)({
  color: `${fr.colors.decisions.text.title.grey.default} !important`,
  padding: '0.75rem 1rem !important',
  width: '100% !important'
});

function AccountDropdown() {
  const { displayName, establishment, user, logOut } = useUser();

  if (!user || !establishment) {
    return null;
  }

  return (
    <Dropdown
      label={displayName()}
      buttonProps={{
        priority: 'tertiary',
        size: 'small',
        iconId: 'fr-icon-arrow-down-s-line',
        iconPosition: 'right'
      }}
      popoverProps={{
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right'
        },
        transformOrigin: {
          vertical: 'top',
          horizontal: 'right'
        }
      }}
    >
      <Stack
        direction="column"
        component="section"
        spacing="1.5rem"
        useFlexGap
        sx={{ width: FIXED_WIDTH }}
      >
        <Box>
          <Stack direction="column" sx={{ px: '1rem', py: '0.75rem' }}>
            <Typography sx={{ fontWeight: 700 }}>
              {user.firstName} {user.lastName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: fr.colors.decisions.text.mention.grey.default }}
            >
              {user.email}
            </Typography>
          </Stack>

          <Divider aria-hidden="true" sx={{ padding: 0 }} />

          <MutedButton
            linkProps={{ to: '/compte' }}
            size="small"
            priority="tertiary no outline"
            sx={{ width: '100%' }}
          >
            Gérer mon profil
          </MutedButton>

          <Divider aria-hidden="true" sx={{ padding: 0 }} />

          <MutedButton
            priority="tertiary no outline"
            size="small"
            iconId="ri-shut-down-line"
            iconPosition="left"
            onClick={logOut}
          >
            Se déconnecter
          </MutedButton>

          <Divider aria-hidden="true" sx={{ padding: 0 }} />
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, px: '1rem', pb: '0.75rem' }}>
            {establishment.name}
          </Typography>

          <Divider aria-hidden="true" sx={{ padding: 0 }} />

          <MutedButton
            linkProps={{ to: '/utilisateurs' }}
            priority="tertiary no outline"
            size="small"
          >
            Voir les utilisateurs
          </MutedButton>

          <Divider aria-hidden="true" sx={{ padding: 0 }} />

          <MutedButton
            linkProps={{ to: '/autres-structures' }}
            priority="tertiary no outline"
            size="small"
          >
            Voir les autres structures
          </MutedButton>

          <Divider aria-hidden="true" sx={{ padding: 0 }} />

          <MutedButton
            linkProps={{ href: 'https://consultdf.cerema.fr/consultdf/' }}
            priority="tertiary no outline"
            size="small"
          >
            Gérer les utilisateurs (redirige vers le Portail des Données
            Foncières)
          </MutedButton>
        </Box>
      </Stack>
    </Dropdown>
  );
}

export default AccountDropdown;
