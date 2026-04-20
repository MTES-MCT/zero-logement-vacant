import {
  CADASTRAL_CLASSIFICATION_VALUES,
  CadastralClassification,
  HousingKind,
  Occupancy,
  OWNERSHIP_KIND_INTERNAL_VALUES,
  OwnershipKindInternal
} from '@zerologementvacant/models';
import z from 'zod';

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
  uncomfortable: boolean | null;
  cadastral_classification: CadastralClassification | null;
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

export const sourceHousingSchema = z.object({
  data_file_year: z.literal('lovac-2025'),
  invariant: z.string().min(1, 'invariant is required'),
  local_id: z.string().min(1, 'local_id is required'),
  building_id: z.string().nullable(),
  building_location: z.string().nullable(),
  building_year: z.preprocess(
    (v) => (v === 0 ? null : v),
    z
      .number()
      .int('building_year must be an integer')
      .min(1)
      .max(new Date().getUTCFullYear())
      .nullable()
  ),
  plot_id: z.string().nullable(),
  geo_code: z.string().length(5, 'geo_code is required'),
  ban_id: z.string().nullable(),
  ban_label: z.string().nullable(),
  ban_score: z.number().nullable(),
  ban_latitude: z.number().min(-90).max(90).nullable(),
  ban_longitude: z.number().min(-180).max(180).nullable(),
  dgfip_address: z.string().min(1, 'dgfip_address is required'),
  dgfip_latitude: z.number().min(-90).max(90).nullable(),
  dgfip_longitude: z.number().min(-180).max(180).nullable(),
  housing_kind: z.nativeEnum(HousingKind),
  condominium: z.enum(OWNERSHIP_KIND_INTERNAL_VALUES).nullable(),
  living_area: z
    .number()
    .min(1)
    .nullable()
    .transform((v) => (v !== null ? Math.trunc(v) : v)),
  rooms_count: z
    .number()
    .int('rooms_count must be an integer')
    .min(0)
    .nullable(),
  uncomfortable: z.boolean().nullable().default(false),
  cadastral_classification: z
    .number()
    .int()
    .refine((v): v is CadastralClassification =>
      (CADASTRAL_CLASSIFICATION_VALUES as readonly number[]).includes(v)
    )
    .nullable(),
  cadastral_reference: z.string().trim().nullable(),
  taxed: z.boolean(),
  rental_value: z.number().int().min(0).nullable(),
  occupancy_source: z.nativeEnum(Occupancy),
  vacancy_start_year: z
    .number()
    .int('vacancy_start_year must be an integer')
    .min(0)
    .max(new Date().getUTCFullYear()),
  mutation_date: z.preprocess(
    (v) => (v !== null && v !== undefined && !(v instanceof Date) ? new Date(v as string) : v),
    z.date().nullable()
  ),
  last_mutation_date: z.preprocess(
    (v) => (v !== null && v !== undefined && !(v instanceof Date) ? new Date(v as string) : v),
    z.date().nullable()
  ),
  last_transaction_date: z.preprocess(
    (v) => (v !== null && v !== undefined && !(v instanceof Date) ? new Date(v as string) : v),
    z.date().nullable()
  ),
  last_transaction_value: z.preprocess(
    (v) => (v !== null && typeof v === 'number' ? Math.round(v) : v),
    z.number().int().min(0).nullable()
  )
});
