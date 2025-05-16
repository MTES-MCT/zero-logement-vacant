import { Mutation } from '@zerologementvacant/models';

import { birthdate } from '../utils/dateUtils';
import { formatPrice } from '../utils/stringUtils';

export function toString(mutation: Mutation): string {
  const type = mutation.type === 'sale' ? 'Vente' : 'Donation';
  const date = birthdate(new Date(mutation.date));
  const amount =
    mutation.type === 'sale' && mutation.amount !== null
      ? ` (Montant : ${formatPrice(mutation.amount)})`
      : '';

  return `${type} le ${date}${amount}`;
}
