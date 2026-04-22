import {
  CADASTRAL_CLASSIFICATION_VALUES,
  HousingKind,
  Occupancy,
  OWNERSHIP_KIND_INTERNAL_VALUES
} from '@zerologementvacant/models';
import z from 'zod';

const sqlDate = z.preprocess(
  (value) =>
    typeof value === 'string' ? value.substring(0, 'yyyy-mm-dd'.length) : value,
  z.iso.date().nullable().default(null)
);

export const sourceHousingSchema = z.object({
  invariant: z.string().min(1, 'invariant is required'),
  local_id: z.string().min(1, 'local_id is required'),
  building_id: z.string().nullable().default(null),
  building_location: z.string().nullable().default(null),
  building_year: z.preprocess(
    (value) => (value === 0 ? null : value),
    z
      .int('building_year must be an integer')
      .min(1)
      .max(new Date().getUTCFullYear())
      .nullable()
  ),
  plot_id: z.string().nullable().default(null),
  geo_code: z.string().length(5, 'geo_code is required'),
  ban_id: z.string().nullable().default(null),
  ban_label: z.string().nullable().default(null),
  ban_score: z.number().nullable().default(null),
  ban_latitude: z.number().min(-90).max(90).nullable().default(null),
  ban_longitude: z.number().min(-180).max(180).nullable().default(null),
  dgfip_address: z.string().min(1, 'dgfip_address is required'),
  latitude_dgfip: z.number().min(-90).max(90).nullable(),
  longitude_dgfip: z.number().min(-180).max(180).nullable(),
  housing_kind: z.enum(HousingKind),
  condominium: z.literal(OWNERSHIP_KIND_INTERNAL_VALUES).nullable(),
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
    .literal(CADASTRAL_CLASSIFICATION_VALUES)
    .nullable()
    .default(null),
  taxed: z.boolean().nullable().default(null),
  rental_value: z.number().int().min(0).nullable().default(null),
  occupancy_source: z.enum(Occupancy).nullable().default(null),
  vacancy_start_year: z
    .number()
    .int('vacancy_start_year must be an integer')
    .min(0)
    .max(new Date().getUTCFullYear()),
  mutation_date: sqlDate,
  last_mutation_date: z.preprocess(
    (value) =>
      typeof value === 'string' && value.length === 'ddmmyyyy'.length
        ? [
            value.substring('ddmm'.length, 'ddmmyyyy'.length),
            value.substring('dd'.length, 'ddmm'.length),
            value.substring(0, 'dd'.length)
          ].join('-')
        : value,
    z.iso.date().nullable().default(null)
  ),
  last_transaction_date: sqlDate,
  last_transaction_value: z
    .number()
    .min(0)
    .transform((value) => Math.round(value))
    .nullable(),
  geolocation_source: z
    .enum(['parcelle-ff', 'bati-rnb', 'adresse-ban'])
    .nullable()
    .default(null)
});

export type SourceHousing = z.infer<typeof sourceHousingSchema>;