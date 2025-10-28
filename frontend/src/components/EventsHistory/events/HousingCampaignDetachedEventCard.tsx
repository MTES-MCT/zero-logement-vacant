import EventCard from '../EventCard';
import type { Event } from '../../../models/Event';

interface Props {
  event: Event<'housing:campaign-detached'>;
}

export function HousingCampaignDetachedEventCard(props: Props) {
  const campaign = props.event.nextOld;
  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[formatHousingCampaignDetachedDifferences(campaign)]}
      title="a retiré ce logement d’une campagne"
    />
  );
}

export function formatHousingCampaignDetachedDifferences(
  campaign: Event<'housing:campaign-detached'>['nextOld']
): string {
  return `Ce logement a été retiré de la campagne “${campaign.name}”.`;
}
