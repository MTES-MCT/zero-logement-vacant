import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { format } from 'date-fns';
import { match, Pattern } from 'ts-pattern';
import type { Campaign } from '~/models/Campaign';
import { formatAuthor } from '~/models/User';
import { useGetEstablishmentQuery } from '~/services/establishment.service';
import { useGetGroupQuery } from '~/services/group.service';
import AppLink from '../_app/AppLink/AppLink';

interface Props {
  campaign: Campaign;
}

function CampaignCreatedFromGroupNext(props: Readonly<Props>) {
  const getGroupQuery = useGetGroupQuery(props.campaign.groupId ?? skipToken);
  const getEstablishmentQuery = useGetEstablishmentQuery(
    props.campaign.createdBy.establishmentId ?? skipToken
  );

  return match({ getGroupQuery, getEstablishmentQuery })
    .with(
      {
        getGroupQuery: { isLoading: true }
      },
      () => <Skeleton variant="text" />
    )
    .with(
      {
        getEstablishmentQuery: { isLoading: true }
      },
      () => <Skeleton variant="text" />
    )
    .with(
      {
        getGroupQuery: {
          isSuccess: true,
          data: Pattern.nonNullable.select('group')
        },
        getEstablishmentQuery: {
          isSuccess: true,
          data: Pattern.nonNullable.select('establishment')
        }
      },
      ({ group, establishment }) => {
        const link = (
          <AppLink isSimple to={`/groupes/${group.id}`}>
            {group.title}
          </AppLink>
        );
        const date = format(new Date(props.campaign.createdAt), 'dd/MM/yyyy');
        const author = formatAuthor(props.campaign.createdBy, establishment);

        return (
          <Typography>
            Cette campagne a été créée depuis le groupe {link} le {date} par{' '}
            {author}
          </Typography>
        );
      }
    )
    .otherwise(() => null);
}

export default CampaignCreatedFromGroupNext;
