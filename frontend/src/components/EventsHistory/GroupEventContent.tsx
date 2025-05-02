import { fr } from '@codegouvfr/react-dsfr';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { match, Pattern } from 'ts-pattern';

import { Event } from '../../models/Event';
import { Group } from '../../models/Group';
import { useGetGroupQuery } from '../../services/group.service';
import AppLink from '../_app/AppLink/AppLink';

interface GroupHousingEventProps {
  event: Event<Group>;
}

export function GroupHousingAddedEventContent(props: GroupHousingEventProps) {
  const { data: group, isLoading } = useGetGroupQuery(
    props.event.new?.id ?? skipToken
  );

  const title = match({ isLoading, group })
    .with({ isLoading: true }, () => (
      <Skeleton component="span" animation="wave" variant="rectangular" />
    ))
    .with(
      {
        isLoading: false,
        group: Pattern.union(Pattern.nullish, {
          archivedAt: Pattern.nonNullable
        })
      },
      () => (
        <Typography
          component="span"
          sx={{
            color: fr.colors.decisions.text.disabled.grey.default
          }}
        >
          {props.event.new?.title}
        </Typography>
      )
    )
    .with(
      { isLoading: false, group: { archivedAt: Pattern.nullish } },
      ({ group }) => (
        <AppLink isSimple to={`/groupes/${group.id}`}>
          {group.title}
        </AppLink>
      )
    )
    .otherwise(() => null);

  return (
    <Typography component="span">
      Ce logement a été ajouté dans le groupe {title}
    </Typography>
  );
}

export function GroupHousingRemovedEventContent(props: GroupHousingEventProps) {
  const { data: group, isLoading } = useGetGroupQuery(
    props.event.old?.id ?? skipToken
  );

  const title = match({ isLoading, group })
    .with({ isLoading: true }, () => (
      <Skeleton component="span" animation="wave" variant="rectangular" />
    ))
    .with({ isLoading: false, group: Pattern.nullish }, () => (
      <Typography
        component="span"
        sx={{
          color: fr.colors.decisions.text.disabled.grey.default
        }}
      >
        {props.event.old?.title}
      </Typography>
    ))
    .with({ isLoading: false, group: Pattern.nonNullable }, ({ group }) => (
      <AppLink isSimple size="sm" to={`/groupes/${group.id}`}>
        {group.title}
      </AppLink>
    ))
    .otherwise(() => null);

  return (
    <Typography component="span">
      Ce logement a été retiré du groupe {title}
    </Typography>
  );
}

export function GroupArchivedEventContent(props: GroupHousingEventProps) {
  return (
    <Typography component="span">
      Le groupe&nbsp;
      <Typography
        component="span"
        sx={{ color: fr.colors.decisions.text.disabled.grey.default }}
      >
        {props.event.old?.title}
      </Typography>
      &nbsp;dans lequel était ce logement a été archivé
    </Typography>
  );
}

export function GroupRemovedEventContent(props: GroupHousingEventProps) {
  return (
    <Typography component="span">
      Le groupe&nbsp;
      <Typography
        component="span"
        sx={{ color: fr.colors.decisions.text.disabled.grey.default }}
      >
        {props.event.old?.title}
      </Typography>
      &nbsp;dans lequel était ce logement a été supprimé
    </Typography>
  );
}
