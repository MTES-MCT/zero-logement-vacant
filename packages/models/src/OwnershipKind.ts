export const OWNERSHIP_KIND_VALUES = ['single', 'co', 'other'] as const;

export type OwnershipKind = (typeof OWNERSHIP_KIND_VALUES)[number];

export const INTERNAL_MONO_CONDOMINIUM_VALUES = ['single'] as const; // and null
export const INTERNAL_CO_CONDOMINIUM_VALUES = [
  'co',
  'CL',
  'CLV',
  'CV'
] as const;
export const OWNERSHIP_KIND_INTERNAL_VALUES = [
  ...INTERNAL_MONO_CONDOMINIUM_VALUES,
  ...INTERNAL_CO_CONDOMINIUM_VALUES
] as const;

export type OwnershipKindInternal =
  (typeof OWNERSHIP_KIND_INTERNAL_VALUES)[number];
