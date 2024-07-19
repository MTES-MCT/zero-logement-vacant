import { boolean, date, number, object, ObjectSchema, string } from 'yup';

import { HOUSING_KIND_VALUES } from '@zerologementvacant/models';

export interface SourceHousing {
  data_file_years: string;
  data_source: string;
  local_id: string;
  building_id: string;
  plot_id: string;
  location_detail: string;
  geo_code: string;
  ban_address: string;
  ban_score: number;
  ban_latitude: number;
  ban_longitude: number;
  geolocalisation: string;
  dgfip_address: string;
  dgfip_longitude: number;
  dgfip_latitude: number;
  housing_kind: string;
  condominium: string;
  living_area: number;
  rooms_count: number;
  building_year: number;
  uncomfortable: boolean;
  cadastral_classification: number;
  beneficiary_count: number;
  taxed: boolean;
  vacancy_start_year: number;
  mutation_date: Date;
}

export const sourceHousingSchema: ObjectSchema<SourceHousing> = object({
  data_file_years: string()
    .required('data_file_years is required')
    .oneOf(['lovac-2024']),
  data_source: string().required('data_source is required').oneOf(['lovac']),
  local_id: string().required('local_id is required'),
  building_id: string().required('building_id is required'),
  plot_id: string().required('plot_id is required'),
  location_detail: string().required('location_detail is required'),
  geo_code: string().required('geo_code is required'),
  ban_address: string().required('ban_address is required'),
  ban_score: number().required('ban_score is required'),
  ban_latitude: number().required('ban_latitude is required'),
  ban_longitude: number().required('ban_longitude is required'),
  geolocalisation: string().required('geolocalisation is required'),
  dgfip_address: string().required('dgfip_address is required'),
  dgfip_latitude: number().required('dgfip_latitude is required'),
  dgfip_longitude: number().required('dgfip_longitude is required'),
  housing_kind: string()
    .oneOf(HOUSING_KIND_VALUES)
    .required('housing_kind is required'),
  condominium: string().required('condominium is required'),
  living_area: number().required('living_area is required'),
  rooms_count: number()
    .integer('rooms_count must be an integer')
    .required('rooms_count is required'),
  building_year: number()
    .integer('building_year must be an integer')
    .required('building_year is required'),
  uncomfortable: boolean().required('uncomfortable is required'),
  cadastral_classification: number().required(
    'cadastral_classification is required'
  ),
  beneficiary_count: number()
    .integer('beneficiary_count must be an integer')
    .required('beneficiary_count is required'),
  taxed: boolean().required('taxed is required'),
  vacancy_start_year: number()
    .integer('vacancy_start_year must be an integer')
    .min(1000)
    .max(9999)
    .required('vacancy_start_year is required'),
  mutation_date: date().required('mutation_date is required')
});
