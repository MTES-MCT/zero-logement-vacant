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
  building_id: string | null;
  building_location: string | null;
  building_year: number | null;
  plot_id: string | null;
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
  living_area: number | null;
  rooms_count: number | null;
  uncomfortable: boolean;
  cadastral_classification: number | null;
  cadastral_reference: string | null;
  taxed: boolean;
  rental_value: number | null;
  occupancy_source: Occupancy;
  vacancy_start_year: number;
  mutation_date: Date | null;
  last_mutation_date: Date | null;
  last_transaction_date: Date | null;
  last_transaction_value: number | null;
}

export const sourceHousingSchema: ObjectSchema<SourceHousing> = object({
  data_file_year: string()
    .required('data_file_years is required')
    .oneOf(['lovac-2025']),
  invariant: string().required('invariant is required'),
  local_id: string().required('local_id is required'),
  building_id: string().defined('building_id must be defined').nullable(),
  building_location: string()
    .defined('building_location must be defined')
    .nullable(),
  building_year: number()
    .integer('building_year must be an integer')
    .defined('building_year must be defined')
    .nullable()
    .transform((value) => (value === 0 ? null : value))
    .min(1)
    .max(new Date().getUTCFullYear()),
  plot_id: string().defined('plot_id is required').nullable(),
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
  living_area: number()
    .defined('living_area must be defined')
    .nullable()
    .min(1)
    .truncate(),
  rooms_count: number()
    .defined('rooms_count must be defined')
    .nullable()
    .integer('rooms_count must be an integer')
    .min(0),
  uncomfortable: boolean().required('uncomfortable is required'),
  cadastral_classification: number()
    .defined('cadastral_classification must be defined')
    .nullable()
    .min(0),
  cadastral_reference: string()
    .defined('cadastral_reference must be defined')
    .nullable()
    .trim(),
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
  mutation_date: date().defined('mutation_Date must be defined').nullable(),
  last_mutation_date: date()
    .defined('last_mutation_date must be defined')
    .nullable(),
  last_transaction_date: date()
    .defined('last_transaction_date must be defined')
    .nullable(),
  last_transaction_value: number()
    .defined('last_transaction_value must be defined')
    .nullable()
    .integer()
    .round()
    .min(1)
});
