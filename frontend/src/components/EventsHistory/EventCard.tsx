import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import localeFR from 'date-fns/locale/fr';
import { ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';

import { useAvailableEstablishments } from '../../hooks/useAvailableEstablishments';
import { formatAuthor, User } from '../../models/User';
import AppBadge from '../_app/AppBadge/AppBadge';
import HistoryCard from './HistoryCard';

interface EventCardProps {
  title: string;
  description: ReactNode;
  createdAt: string | Date;
  createdBy: User;
}

function EventCard(props: EventCardProps) {
  const date: string = format(new Date(props.createdAt), 'dd MMMM yyyy', {
    locale: localeFR
  });
  const time: string = format(new Date(props.createdAt), 'HH:mm', {
    locale: localeFR
  });
  const { availableEstablishments } = useAvailableEstablishments();
  const establishment = availableEstablishments?.find(
    (establishment) => establishment.id === props.createdBy.establishmentId
  );
  const author = match(props.createdBy)
    .returnType<string>()
    .with(
      { firstName: Pattern.nonNullable, lastName: Pattern.nonNullable },
      (user) => `${user.firstName} ${user.lastName} (${establishment?.name})`
    )
    .otherwise((user) => formatAuthor(user, establishment ?? null));

  return (
    <HistoryCard icon="ri-folder-line">
      <Stack component="section" sx={{ flexGrow: 1 }}>
        <AppBadge
          className={fr.cx('fr-mb-1w')}
          colorFamily="blue-cumulus"
          small
        >
          Mise à jour
        </AppBadge>

        <Typography sx={{ mb: '0.75rem' }}>
          <Typography component="span" sx={{ fontWeight: 700, mb: '1rem' }}>
            {author} {props.title}
          </Typography>
          <Typography component="span">
            &nbsp;le {date} à {time}
          </Typography>
        </Typography>

        {props.description}
      </Stack>
    </HistoryCard>
  );
}

export default EventCard;
