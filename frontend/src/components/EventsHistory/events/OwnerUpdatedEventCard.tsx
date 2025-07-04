import { Event } from '../../../models/Event';
import { birthdate } from '../../../utils/dateUtils';
import EventCard from '../EventCard';

interface Props {
  event: Event<'owner:updated'>;
}

export function OwnerUpdatedEventCard(props: Props) {
  const { nextOld, nextNew, createdAt, creator } = props.event;
  const differences = formatOwnerUpdatedDifferences({ nextOld, nextNew });

  return (
    <EventCard
      createdAt={createdAt}
      createdBy={creator}
      differences={differences}
      title="a mis à jour les informations d’un propriétaire"
    />
  );
}

const FALLBACK_VALUE = 'vide';

export function formatOwnerUpdatedDifferences({
  nextOld: before,
  nextNew: after
}: Pick<Event<'owner:updated'>, 'nextOld' | 'nextNew'>): string[] {
  const diffs: string[] = [];
  if (before.name !== after.name) {
    diffs.push(
      `Le nom et prénom du propriétaire “${after.name}” sont passés de “${before.name}” à “${after.name}”.`
    );
  }
  if (before.birthdate !== after.birthdate && after.birthdate) {
    const oldDate = before.birthdate
      ? birthdate(before.birthdate)
      : FALLBACK_VALUE;
    const newDate = birthdate(after.birthdate);
    diffs.push(
      `La date de naissance du propriétaire “${after.name}” est passée de “${oldDate}” à “${newDate}”.`
    );
  }
  if (before.email !== after.email && after.email) {
    diffs.push(
      `L’adresse e-mail du propriétaire “${after.name}” est passée de “${before.email ?? FALLBACK_VALUE}” à “${after.email}”.`
    );
  }
  if (before.phone !== after.phone && after.phone) {
    diffs.push(
      `Le numéro de téléphone du propriétaire “${after.name}” est passé de “${before.phone ?? FALLBACK_VALUE}” à “${after.phone}”.`
    );
  }
  if (before.address !== after.address && after.address) {
    diffs.push(
      `L’adresse postale du propriétaire “${after.name}” est passée de “${before.address ?? FALLBACK_VALUE}” à “${after.address}”.`
    );
  }
  if (
    before.additionalAddress !== after.additionalAddress &&
    after.additionalAddress
  ) {
    diffs.push(
      `Le complément d’adresse du propriétaire “${after.name}” est passée de “${before.additionalAddress ?? FALLBACK_VALUE}” à “${after.additionalAddress}”.`
    );
  }
  return diffs;
}
