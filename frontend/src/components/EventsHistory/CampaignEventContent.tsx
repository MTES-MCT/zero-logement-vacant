import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { match, Pattern } from 'ts-pattern';

import { Event } from '../../models/Event';
import { useGetCampaignQuery } from '../../services/campaign.service';
import AppLink from '../_app/AppLink/AppLink';

interface CampaignEventContentProps {
  event: Event;
}

function CampaignEventContent(props: CampaignEventContentProps) {
  return match(props.event)
    .with({ name: 'Ajout dans une campagne' }, (event) => (
      <CampaignCreatedEventContent event={event} />
    ))
    .otherwise(() => null);
}

function CampaignCreatedEventContent(props: CampaignEventContentProps) {
  const after: ReadonlyArray<string> = props.event.new?.campaignIds ?? [];
  const before: ReadonlyArray<string> = props.event.old?.campaignIds ?? [];
  const id = after.filter((id1) => !before.some((id2) => id2 === id1)).at(0);
  const { data: campaign, isLoading } = useGetCampaignQuery(id ?? skipToken);

  return match({ isLoading, campaign })
    .with({ isLoading: true }, () => (
      <Skeleton animation="wave" variant="text" />
    ))
    .with({ isLoading: false, campaign: Pattern.nullish }, () => (
      <Typography>
        Ce logement a été&nbsp;
        <Typography component="span" sx={{ fontWeight: 700 }}>
          ajouté dans une campagne
        </Typography>
      </Typography>
    ))
    .with(
      { isLoading: false, campaign: Pattern.nonNullable },
      ({ campaign }) => (
        <Typography>
          Ce logement a été ajouté dans la campagne&nbsp;
          <AppLink
            iconId="fr-icon-mail-fill"
            iconPosition="left"
            isSimple
            to={`/campagnes/${campaign.id}`}
          >
            {campaign.title}
          </AppLink>
        </Typography>
      )
    )
    .otherwise(() => null);
}

export default CampaignEventContent;
