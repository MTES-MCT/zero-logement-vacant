import type { Mutation } from '@zerologementvacant/models';
import { match } from 'ts-pattern';

import { birthdate } from '../utils/dateUtils';
import { formatPrice } from '../utils/stringUtils';

export function toString(mutation: Mutation): string {
  const type = match(mutation.type)
    .returnType<string | null>()
    .with('sale', () => 'Vente')
    .with('donation', () => 'Donation')
    .with(null, () => null)
    .exhaustive();
  const date = birthdate(new Date(mutation.date));
  const amount =
    mutation.type === 'sale' && mutation.amount !== null
      ? ` (Montant : ${formatPrice(mutation.amount)})`
      : '';

  if (!type) {
    return date;
  }

  return `${type} le ${date}${amount}`;
}
