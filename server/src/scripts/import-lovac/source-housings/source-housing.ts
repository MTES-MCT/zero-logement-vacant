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
  ban_address: string | null;
  ban_score: number | null;
  ban_latitude: number | null;
  ban_longitude: number | null;
  geolocalisation: string | null;
  dgfip_address: string;
  dgfip_longitude: number | null;
  dgfip_latitude: number | null;
  housing_kind: string;
  condominium: string | null;
  living_area: number;
  rooms_count: number;
  building_year: number | null;
  uncomfortable: boolean;
  cadastral_classification: number;
  beneficiary_count: number;
  taxed: boolean;
  vacancy_start_year: number;
  mutation_date: Date | null;
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
  geo_code: string().length(5).required('geo_code is required'),
  ban_address: string().defined('ban_address must be defined').nullable(),
  ban_score: number().defined('ban_score must be defined').nullable(),
  ban_latitude: number()
    .defined('ban_latitude must be defined')
    .min(-90)
    .max(90)
    .nullable(),
  ban_longitude: number()
    .required('ban_longitude is required')
    .min(-180)
    .max(180)
    .nullable(),
  geolocalisation: string()
    .defined('geolocalisation must be defined')
    .nullable(),
  dgfip_address: string().required('dgfip_address is required'),
  dgfip_latitude: number()
    .defined('dgfip_latitude must be defined')
    .nullable()
    .min(-90)
    .max(90),
  dgfip_longitude: number()
    .defined('dgfip_longitude must be defined')
    .nullable()
    .min(-180)
    .max(180),
  housing_kind: string()
    .oneOf(HOUSING_KIND_VALUES)
    .required('housing_kind is required'),
  condominium: string().defined('condominium must be defined').nullable(),
  living_area: number().required('living_area is required').min(0).truncate(),
  rooms_count: number()
    .integer('rooms_count must be an integer')
    .required('rooms_count is required')
    .min(0),
  building_year: number()
    .integer('building_year must be an integer')
    .defined('building_year must be defined')
    .nullable()
    .transform((value) => (value === 0 ? null : value))
    .min(1)
    .max(new Date().getUTCFullYear()),
  uncomfortable: boolean().required('uncomfortable is required'),
  cadastral_classification: number()
    .required('cadastral_classification is required')
    .min(0),
  beneficiary_count: number()
    .integer('beneficiary_count must be an integer')
    .required('beneficiary_count is required')
    .min(1),
  taxed: boolean().required('taxed is required'),
  vacancy_start_year: number()
    .integer('vacancy_start_year must be an integer')
    .min(0)
    .max(new Date().getUTCFullYear())
    .required('vacancy_start_year is required'),
  mutation_date: date().defined('mutation_date must be defined').nullable()
});
