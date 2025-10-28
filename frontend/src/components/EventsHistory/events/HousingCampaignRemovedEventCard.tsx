import EventCard from '../EventCard';
import type { Event } from '../../../models/Event';

interface Props {
  event: Event<'housing:campaign-removed'>;
}

export function HousingCampaignRemovedEventCard(props: Props) {
  const campaign = props.event.nextOld;
  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[formatHousingCampaignRemovedDifferences(campaign)]}
      title={`a supprimé la campagne “${campaign.name}” dans laquelle le logement se trouvait`}
    />
  );
}

export function formatHousingCampaignRemovedDifferences(
  campaign: Event<'housing:campaign-removed'>['nextOld']
): string {
  return `Ce logement a donc été retiré de la campagne “${campaign.name}”.`;
}
