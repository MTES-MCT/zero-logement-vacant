import { Event } from '../../../models/Event';
import EventCard from '../EventCard';

interface Props {
  event: Event<'housing:campaign-attached'>;
}

export function HousingCampaignAttachedEventCard(props: Props) {
  const campaign = props.event.nextNew;
  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[formatHousingCampaignAttachedDifferences(campaign)]}
      title="a ajouté ce logement dans une campagne"
    />
  );
}

export function formatHousingCampaignAttachedDifferences(
  campaign: Event<'housing:campaign-attached'>['nextNew']
): string {
  return `Ce logement a été ajouté à la campagne “${campaign.name}”.`;
}
