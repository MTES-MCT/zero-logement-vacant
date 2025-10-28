import {
  isPrecisionBlockingPointCategory,
  isPrecisionEvolutionCategory,
  isPrecisionMechanismCategory
} from '@zerologementvacant/models';
import { match } from 'ts-pattern';

import EventCard from '../EventCard';
import type { Event } from '../../../models/Event';

interface Props {
  event: Event<'housing:precision-detached'>;
}

export function HousingPrecisionDetachedEventCard(props: Props) {
  const precision = props.event.nextOld;

  const category = match(precision.category)
    .when(isPrecisionMechanismCategory, () => 'un dispositif')
    .when(isPrecisionEvolutionCategory, () => 'une évolution')
    .when(isPrecisionBlockingPointCategory, () => 'un point de blocage')
    .exhaustive();
  const title = `a retiré ${category}`;
  const differences = formatHousingPrecisionDetachedDifferences(precision);

  return (
    <EventCard
      createdAt={props.event.createdAt}
      createdBy={props.event.creator}
      differences={[differences]}
      title={title}
    />
  );
}

export function formatHousingPrecisionDetachedDifferences(
  precision: Event<'housing:precision-attached'>['nextNew']
): string {
  return match(precision.category)
    .when(
      isPrecisionMechanismCategory,
      () => `Le dispositif “${precision.label}” a été retiré.`
    )
    .when(
      isPrecisionBlockingPointCategory,
      () => `Le point de blocage “${precision.label}” a été retiré.`
    )
    .when(
      isPrecisionEvolutionCategory,
      () => `L’évolution “${precision.label}” a été retirée.`
    )
    .exhaustive();
}
