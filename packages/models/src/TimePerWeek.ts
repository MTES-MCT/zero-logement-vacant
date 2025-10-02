export const TIME_PER_WEEK_VALUES = [
  'Moins de 0,5 jour',
  '0,5 jour',
  '1 jour',
  '2 jours',
  'Plus de 2 jours'
] as const;

export type TimePerWeek = (typeof TIME_PER_WEEK_VALUES)[number];
