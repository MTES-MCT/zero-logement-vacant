export interface SourceHousing {
  local_id: string;
  geo_code: string;
  data_file_years: string;
  data_source: string;
  building_id: string;
  plot_id: string;
  dgfip_address: string;
  dgfip_latitude: number;
  dgfip_longitude: number;
  location_detail: string;
  ban_address: string;
  ban_score: string;
  ban_latitude: number;
  ban_longitude: number;
  housing_kind: string;
  condominium: string;
  rooms_count: number;
  building_year: number;
  uncomfortable: boolean;
  cadastral_classification: number;
  beneficiary_count: number;
  rental_value: number;
  living_area: number;
  taxed: boolean;
  vacancy_start_year: number;
  mutation_date: string;
  occupancy_source: string;
  bdnb_building_group_id: string;
  bdnb_energy_consumption: string | null;
  bdnb_energy_consumption_at: Date | null;
}