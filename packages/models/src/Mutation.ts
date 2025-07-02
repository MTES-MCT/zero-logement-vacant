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
export type MutationType = Mutation['type'];
export const MUTATION_TYPE_VALUES = [
  'donation',
  'sale',
  null
] as const satisfies ReadonlyArray<MutationType>;

export function fromHousing(
  housing: Pick<
    HousingDTO,
    | 'lastMutationType'
    | 'lastMutationDate'
    | 'lastTransactionDate'
    | 'lastTransactionValue'
  >
): Mutation | null {
  const lastMutationType = housing.lastMutationType;
  const lastMutationDate = housing.lastMutationDate
    ? new Date(housing.lastMutationDate)
    : null;
  const lastTransactionDate = housing.lastTransactionDate
    ? new Date(housing.lastTransactionDate)
    : null;
  const lastTransactionValue = housing.lastTransactionValue;

  if (lastMutationType === null) {
    return null;
  }

  if (lastMutationType === 'sale' && lastTransactionDate) {
    return {
      type: lastMutationType,
      date: lastTransactionDate,
      amount: lastTransactionValue
    };
  }

  if (lastMutationType === 'donation' && lastMutationDate) {
    return {
      type: lastMutationType,
      date: lastMutationDate
    };
  }

  if (lastMutationType === null && lastMutationDate) {
    return {
      type: lastMutationType,
      date: lastMutationDate
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

export const LAST_MUTATION_TYPE_FILTER_VALUES = [
  'donation',
  'sale'
] satisfies ReadonlyArray<MutationType>;
export type LastMutationTypeFilter =
  (typeof LAST_MUTATION_TYPE_FILTER_VALUES)[number];
