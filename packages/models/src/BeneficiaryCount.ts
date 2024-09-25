export const BENEFIARY_COUNT_VALUES = [
  '0',
  '1',
  '2',
  '3',
  '4',
  'gte5'
] as const;

export type BeneficiaryCount = (typeof BENEFIARY_COUNT_VALUES)[number];
