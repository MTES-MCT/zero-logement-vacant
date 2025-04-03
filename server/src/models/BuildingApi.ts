export interface BuildingApi {
  id: string;
  housingCount: number;
  rentHousingCount: number | null;
  vacantHousingCount: number;
  rnbId: string | null;
  rnbIdScore: number | null;
}
