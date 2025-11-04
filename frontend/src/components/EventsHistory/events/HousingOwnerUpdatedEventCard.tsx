import { getHousingOwnerRankLabel } from '../../../models/HousingOwner';
import EventCard from '../EventCard';
import type { Event } from '../../../models/Event';

interface Props {
  event: Event<'housing:owner-updated'>;
}

export function HousingOwnerUpdatedEventCard(props: Props) {
  const before = props.event.nextOld;
  const after = props.event.nextNew;

  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[
        formatHousingOwnerUpdatedDifferences({ old: before, new: after })
      ]}
      title="a mis à jour le rang d’un propriétaire"
    />
  );
}

interface DifferencesOptions {
  old: Event<'housing:owner-updated'>['nextOld'];
  new: Event<'housing:owner-updated'>['nextNew'];
}

export function formatHousingOwnerUpdatedDifferences(
  options: DifferencesOptions
): string {
  const rankBefore = getHousingOwnerRankLabel(options.old.rank);
  const rankAfter = getHousingOwnerRankLabel(options.new.rank);
  return `Le propriétaire “${options.old.name}” est passé de “${rankBefore}” à “${rankAfter}”.`;
}
