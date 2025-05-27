import { fr } from '@codegouvfr/react-dsfr';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import localeFR from 'date-fns/locale/fr';
import { ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';

import { useAvailableEstablishments } from '../../hooks/useAvailableEstablishments';
import { formatAuthor, User } from '../../models/User';

interface EventCardProps {
  title: string;
  description: ReactNode;
  createdAt: string | Date;
  createdBy: User;
}

function EventCard(props: EventCardProps) {
  const date: string = format(
    new Date(props.createdAt),
    'dd MMMM yyyy, HH:mm',
    { locale: localeFR }
  );
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
    <Stack
      component="article"
      sx={{
        border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
        padding: '1rem'
      }}
    >
      <Typography
        component="h4"
        sx={{ fontSize: '1.125rem', fontWeight: 700, mb: '1rem' }}
      >
        {props.title}
      </Typography>

      <Box sx={{ mb: '0.75rem' }}>{props.description}</Box>

      <hr />

      <Typography component="p" variant="body2">
        {`Le ${date} par `}
        <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
          {author}
        </Typography>
      </Typography>
    </Stack>
  );
}

export default EventCard;
