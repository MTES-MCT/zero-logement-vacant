import {
  HOUSING_KIND_VALUES,
  HousingKind,
  Occupancy,
  OCCUPANCY_VALUES,
  OWNERSHIP_KIND_INTERNAL_VALUES,
  OwnershipKindInternal
} from '@zerologementvacant/models';
import { boolean, date, number, object, ObjectSchema, string } from 'yup';

export interface SourceHousing {
  data_file_year: string;
  invariant: string;
  local_id: string;
  building_id: string;
  building_location: string;
  building_year: number | null;
  plot_id: string;
  geo_code: string;
  ban_id: string | null;
  ban_label: string | null;
  ban_score: number | null;
  ban_latitude: number | null;
  ban_longitude: number | null;
  dgfip_address: string;
  dgfip_longitude: number | null;
  dgfip_latitude: number | null;
  housing_kind: HousingKind;
  condominium: OwnershipKindInternal | null;
  living_area: number;
  rooms_count: number;
  uncomfortable: boolean;
  cadastral_classification: number | null;
  taxed: boolean;
  rental_value: number | null;
  occupancy_source: Occupancy;
  vacancy_start_year: number;
  last_mutation_date: Date | null;
}

export const sourceHousingSchema: ObjectSchema<SourceHousing> = object({
  data_file_year: string()
    .required('data_file_years is required')
    .oneOf(['lovac-2025']),
  invariant: string().required('invariant is required'),
  local_id: string().required('local_id is required'),
  building_id: string().required('building_id is required'),
  building_location: string().required('building_location is required'),
  building_year: number()
    .integer('building_year must be an integer')
    .defined('building_year must be defined')
    .nullable()
    .transform((value) => (value === 0 ? null : value))
    .min(1)
    .max(new Date().getUTCFullYear()),
  plot_id: string().required('plot_id is required'),
  geo_code: string().length(5).required('geo_code is required'),
  ban_id: string().defined('ban_id must be defined').nullable(),
  ban_label: string().defined('ban_id must be defined').nullable(),
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
  condominium: string()
    .oneOf(OWNERSHIP_KIND_INTERNAL_VALUES)
    .defined('condominium must be defined')
    .nullable(),
  living_area: number().required('living_area is required').min(1).truncate(),
  rooms_count: number()
    .integer('rooms_count must be an integer')
    .required('rooms_count is required')
    .min(0),
  uncomfortable: boolean().required('uncomfortable is required'),
  cadastral_classification: number()
    .defined('cadastral_classification must be defined')
    .nullable()
    .min(0),
  taxed: boolean().required('taxed is required'),
  rental_value: number()
    .defined('rental_value must be defined')
    .nullable()
    .integer()
    .min(0),
  occupancy_source: string()
    .required('occupancy_source is required')
    .oneOf(OCCUPANCY_VALUES),
  vacancy_start_year: number()
    .integer('vacancy_start_year must be an integer')
    .min(0)
    .max(new Date().getUTCFullYear())
    .required('vacancy_start_year is required'),
  last_mutation_date: date()
    .defined('last_mutation_date must be defined')
    .nullable()
});
