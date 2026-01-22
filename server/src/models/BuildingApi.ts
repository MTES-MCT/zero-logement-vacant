import {
  BuildingDTO,
  type EnergyConsumption
} from '@zerologementvacant/models';

export interface BuildingApi extends BuildingDTO {
  ges: {
    /**
     * @example 'A'
     */
    class: EnergyConsumption;
  } | null;
  /**
   * @example 'Gaz naturel'
   * @example 'Électricité'
   */
  heating: string | null;
}

export function toBuildingDTO(building: BuildingApi): BuildingDTO {
  return {
    id: building.id,
    housingCount: building.housingCount,
    rentHousingCount: building.rentHousingCount,
    vacantHousingCount: building.vacantHousingCount,
    dpe: building.dpe
      ? {
          id: building.dpe.id,
          class: building.dpe.class,
          doneAt: building.dpe.doneAt,
          type: building.dpe.type,
          match: building.dpe.match
        }
      : null,
    rnb: building.rnb
      ? {
          id: building.rnb.id,
          score: building.rnb.score
        }
      : null
  };
}
