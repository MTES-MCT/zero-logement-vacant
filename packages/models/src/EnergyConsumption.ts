export const ENERGY_CONSUMPTION_VALUES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
] as const;

export type EnergyConsumption = (typeof ENERGY_CONSUMPTION_VALUES)[number];
