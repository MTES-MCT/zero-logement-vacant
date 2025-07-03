import { HousingDTO } from './HousingDTO';

interface Unknown {
  type: null;
  date: Date;
}
interface Sale {
  type: 'sale';
  date: Date;
  amount: number | null;
}
interface Donation {
  type: 'donation';
  date: Date;
}
export type Mutation = Sale | Donation | Unknown;

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

  if (lastMutationDate && !lastTransactionDate) {
    return {
      type: null,
      date: lastMutationDate
    };
  }

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

  if (lastTransactionDate) {
    return {
      type: 'sale',
      date: lastTransactionDate,
      amount: lastTransactionValue
    };
  }

  return null;
}
