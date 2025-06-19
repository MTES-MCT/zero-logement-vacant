import { match } from 'ts-pattern';

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
