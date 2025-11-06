import {
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory
} from '@zerologementvacant/models';
import { match } from 'ts-pattern';

import EventCard from '../EventCard';
import type { Event } from '../../../models/Event';

interface Props {
  event: Event<'housing:precision-attached'>;
}

export function HousingPrecisionAttachedEventCard(props: Props) {
  const precision = props.event.nextNew;

  const category = match(precision.category)
    .when(isPrecisionMechanismCategory, () => 'un dispositif')
    .when(isPrecisionEvolutionCategory, () => 'une évolution')
    .when(isPrecisionBlockingPointCategory, () => 'un point de blocage')
    .exhaustive();
  const title = `a ajouté ${category}`;
  const differences = formatHousingPrecisionAttachedDifferences(precision);

  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[differences]}
      title={title}
    />
  );
}

export function formatHousingPrecisionAttachedDifferences(
  precision: Event<'housing:precision-attached'>['nextNew']
): string {
  return match(precision.category)
    .when(
      isPrecisionMechanismCategory,
      () => `Le dispositif “${precision.label}” a été ajouté.`
    )
    .when(
      isPrecisionBlockingPointCategory,
      () => `Le point de blocage “${precision.label}” a été ajouté.`
    )
    .when(
      isPrecisionEvolutionCategory,
      () => `L’évolution “${precision.label}” a été ajoutée.`
    )
    .exhaustive();
}
