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

  if (!lastMutationDate && lastTransactionDate) {
    return {
      type: 'sale',
      date: lastTransactionDate,
      amount: lastTransactionValue
    };
  }

  return null;
}

export const LAST_MUTATION_YEAR_FILTER_VALUES = [
  '2024',
  '2023',
  '2022',
  '2021',
  '2015to2020',
  '2010to2014',
  'lte2009'
] as const;
export type LastMutationYearFilter =
  (typeof LAST_MUTATION_YEAR_FILTER_VALUES)[number];
