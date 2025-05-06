import { HousingDTO } from './HousingDTO';

export interface Sale {
  type: 'sale';
  date: Date;
  amount: number | null;
}
export interface Donation {
  type: 'donation';
  date: Date;
}
export type Mutation = Sale | Donation;

export function fromHousing(
  housing: Pick<
    HousingDTO,
    'lastMutationDate' | 'lastTransactionDate' | 'lastTransactionValue'
  >
): Mutation | null {
  const lastMutationDate = housing.lastMutationDate
    ? new Date(housing.lastMutationDate)
    : null;
  const lastTransactionDate = housing.lastTransactionDate
    ? new Date(housing.lastTransactionDate)
    : null;
  const lastTransactionValue = housing.lastTransactionValue;

  if (lastMutationDate && lastTransactionDate) {
    return lastMutationDate > lastTransactionDate
      ? {
          type: 'donation',
          date: lastMutationDate
        }
      : {
          type: 'sale',
          date: lastTransactionDate,
          amount: lastTransactionValue
        };
  }

  if (lastMutationDate && !lastTransactionDate) {
    return {
      type: 'donation',
      date: lastMutationDate
    };
  }

  if (lastTransactionDate) {
    return {
      type: 'sale',
      date: lastTransactionDate,
      amount: lastTransactionValue
    };
  }

  return null;
}
