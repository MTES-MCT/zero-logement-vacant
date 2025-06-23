import { fr } from '@codegouvfr/react-dsfr';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import localeFR from 'date-fns/locale/fr';
import { ReactNode } from 'react';

import { useAvailableEstablishments } from '../../hooks/useAvailableEstablishments';
import { ADMIN_LABEL, formatAuthor, User } from '../../models/User';
import AppBadge from '../_app/AppBadge/AppBadge';
import HistoryCard from './HistoryCard';

interface EventCardProps {
  title: string;
  differences: ReadonlyArray<ReactNode>;
  createdAt: string | Date;
  createdBy: User;
}

function EventCard(props: EventCardProps) {
  const date: string = format(new Date(props.createdAt), 'dd/MM/yyyy', {
    locale: localeFR
  });
  const time: string = format(new Date(props.createdAt), 'HH:mm', {
    locale: localeFR
  });
  const { availableEstablishments } = useAvailableEstablishments();
  const establishment = availableEstablishments?.find(
    (establishment) => establishment.id === props.createdBy.establishmentId
  );
  const isAdmin =
    props.createdBy.email === 'admin@zerologementvacant.beta.gouv.fr';
  const author = isAdmin
    ? ADMIN_LABEL
    : formatAuthor(props.createdBy, establishment ?? null);

  return (
    <HistoryCard icon="ri-folder-line">
      <Stack
        aria-label="Mise à jour"
        component="section"
        spacing="0.5rem"
        sx={{ flexGrow: 1 }}
      >
        <AppBadge colorFamily="blue-cumulus" small>
          Mise à jour
        </AppBadge>

        <Typography>
          <Typography component="span" sx={{ fontWeight: 700, mb: '1rem' }}>
            {author} {props.title}
          </Typography>
          <Typography component="span">
            &nbsp;le {date} à {time}
          </Typography>
        </Typography>

        {props.differences.length === 1 ? (
          <Typography
            variant="body2"
            sx={{ color: fr.colors.decisions.text.mention.grey.default }}
          >
            {props.differences[0]}
          </Typography>
        ) : (
          <Box
            component="ul"
            sx={{
              color: fr.colors.decisions.text.mention.grey.default,
              fontSize: '0.875rem'
            }}
          >
            {props.differences.map((difference, i) => (
              <li key={i}>{difference}</li>
            ))}
          </Box>
        )}
      </Stack>
    </HistoryCard>
  );
}

export default EventCard;
