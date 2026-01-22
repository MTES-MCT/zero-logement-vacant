export const ENERGY_CONSUMPTION_VALUES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type EnergyConsumption = (typeof ENERGY_CONSUMPTION_VALUES)[number];

export const ENERGY_CONSUMPTION_TYPE_VALUES = [
  'dpe appartement individuel',
  'dpe immeuble collectif',
  'dpe maison individuelle'
] as const;
export type EnergyConsumptionType =
  (typeof ENERGY_CONSUMPTION_TYPE_VALUES)[number];

export const ENERGY_CONSUMPTION_MATCH_VALUES = ['plot_id', 'rnb_id'] as const;
export type EnergyConsumptionMatch =
  (typeof ENERGY_CONSUMPTION_MATCH_VALUES)[number];