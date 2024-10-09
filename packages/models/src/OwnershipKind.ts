export const OWNERSHIP_KIND_VALUES = ['single', 'co', 'other'] as const;

export type OwnershipKind = (typeof OWNERSHIP_KIND_VALUES)[number];

export const INTERNAL_MONO_CONDOMINIUM_VALUES = ['single'] as const; // and null
export const INTERNAL_CO_CONDOMINIUM_VALUES = [
  'co',
  'CL',
  'CLV',
  'CV'
] as const;
