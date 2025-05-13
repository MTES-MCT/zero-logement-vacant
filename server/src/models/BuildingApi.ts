import { BuildingDTO } from '@zerologementvacant/models';

export interface BuildingApi {
  id: string;
  housingCount: number;
  rentHousingCount: number;
  vacantHousingCount: number;
  rnbId: string | null;
  rnbIdScore: number | null;
}

export function toBuildingDTO(building: BuildingApi): BuildingDTO {
  return {
    id: building.id,
    housingCount: building.housingCount,
    rentHousingCount: building.rentHousingCount,
    vacantHousingCount: building.vacantHousingCount
  };
}
