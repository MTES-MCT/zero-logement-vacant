import type { EnergyConsumption } from './EnergyConsumption';

export interface BuildingDTO {
  id: string;
  housingCount: number;
  vacantHousingCount: number;
  rentHousingCount: number;
  rnb: {
    id: string | null;
    score: number;
  } | null;
  dpe: {
    id: string;
    class: EnergyConsumption;
    /**
     * An ISO 8601 date string
     * @example '2023-01-15'
     */
    createdAt: string
    type: 'dpe appartement individuel' | 'dpe maison individuelle'
    match: 'plot_id' | 'rnb_id'
  } | null;
}
