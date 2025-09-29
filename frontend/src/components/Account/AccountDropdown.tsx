import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import styled from '@emotion/styled';
import { Divider } from '@mui/material';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

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

  const [open, setOpen] = useState(false);

  function doOpen() {
    setOpen(true);
  }

  function doClose() {
    setOpen(false);
  }

  if (!user || !establishment) {
    return null;
  }

  return (
    <Dropdown
      label={displayName()}
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
      open={open}
      onOpen={doOpen}
      onClose={doClose}
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
            linkProps={{
              to: '/compte',
              onClick: doClose
            }}
            size="small"
            priority="tertiary no outline"
          >
            Gérer mon profil
          </MutedButton>

          <Divider aria-hidden="true" sx={{ padding: 0 }} />
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, px: '1rem', pb: '0.75rem' }}>
            {establishment.name}
          </Typography>

          <Divider aria-hidden="true" sx={{ padding: 0 }} />

          <MutedButton
            linkProps={{
              to: '/utilisateurs',
              onClick: doClose
            }}
            priority="tertiary no outline"
            size="small"
          >
            Utilisateurs rattachés à votre structure
          </MutedButton>

          <Divider aria-hidden="true" sx={{ padding: 0 }} />

          <MutedButton
            linkProps={{
              to: '/autres-structures',
              onClick: doClose
            }}
            priority="tertiary no outline"
            size="small"
          >
            Autres structures sur votre territoire
          </MutedButton>
        </Box>

        <Stack
          direction="row"
          sx={{
            px: '1rem',
            pb: '1rem',
            justifyContent: 'center'
          }}
        >
          <Button
            priority="tertiary"
            size="small"
            iconId="ri-shut-down-line"
            iconPosition="left"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={logOut}
          >
            Se déconnecter
          </Button>
        </Stack>
      </Stack>
    </Dropdown>
  );
}

export default AccountDropdown;
