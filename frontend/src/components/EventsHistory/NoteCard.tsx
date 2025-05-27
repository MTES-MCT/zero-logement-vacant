import { fr } from '@codegouvfr/react-dsfr';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import localeFR from 'date-fns/locale/fr';

import { Establishment } from '../../models/Establishment';
import { formatAuthor, User } from '../../models/User';
import AppBadge from '../_app/AppBadge/AppBadge';

export interface NoteCardProps {
  createdAt: Date | string;
  createdBy: User;
  content: string;
  establishment: Pick<Establishment, 'name'> | null;
}

function NoteCard(props: NoteCardProps) {
  const date: string = format(new Date(props.createdAt), 'dd MMMM yyyy', {
    locale: localeFR
  });
  const time: string = format(new Date(props.createdAt), 'HH:mm', {
    locale: localeFR
  });

  return (
    <Stack direction="row" spacing="1rem" sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          display: 'flex',
          background: fr.colors.decisions.background.alt.grey.hover,
          borderRadius: '50%',
          padding: '0.25rem',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.625rem',
          flexShrink: 0,
          aspectRatio: '1/1',
          width: '2.375rem',
          height: '2.375rem'
        }}
      >
        <span className={fr.cx('ri-message-line')} />
      </Box>

      <Stack
        sx={{
          border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
          padding: '1rem',
          flexGrow: 1
        }}
      >
        <AppBadge className="fr-mb-1w" colorFamily="orange-terre-battue" small>
          Note
        </AppBadge>

        <Typography sx={{ mb: '0.75rem' }}>
          <Typography sx={{ fontWeight: 700 }} component="span">
            {formatAuthor(props.createdBy, props.establishment)}
          </Typography>
          <Typography component="span">
            &nbsp;le {date} à {time}
          </Typography>
        </Typography>

        <Typography>{props.content}</Typography>
      </Stack>
    </Stack>
  );
}

export default NoteCard;
