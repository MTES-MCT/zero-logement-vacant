import type { RelativeLocation } from '@zerologementvacant/models';
import { match } from 'ts-pattern';

export const RELATIVE_LOCATION_LABELS: Record<RelativeLocation, string> = {
  'same-address': 'Habite la même adresse',
  'same-commune': 'Habite dans la même commune',
  'same-department': 'Habite dans le même département',
  'same-region': 'Habite dans la même région',
  metropolitan: 'Habite dans une autre région',
  overseas: 'Habite dans une autre région',
  'foreign-country': 'Habite à l’étranger',
  other: 'Pas d’information'
};

export function getHousingOwnerRankLabel(rank: number): string {
  return match(rank)
    .with(
      -2,
      () => 'Propriétaire doublon LOVAC 2024 - En attente de traitement par ZLV'
    )
    .with(-1, () => 'Propriétaire incorrect')
    .with(0, () => 'Ancien propriétaire')
    .with(1, () => 'Propriétaire principal')
    .when(
      (rank) => rank >= 2,
      () => 'Propriétaire secondaire'
    )
    .otherwise(() => 'Propriétaire');
}
