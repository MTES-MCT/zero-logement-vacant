import type {
  EnergyConsumption,
  EnergyConsumptionMatch,
  EnergyConsumptionType
} from './EnergyConsumption';

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
    doneAt: string;
    type: EnergyConsumptionType;
    match: EnergyConsumptionMatch;
  } | null;
}
