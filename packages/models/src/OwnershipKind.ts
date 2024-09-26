export const OWNERSHIP_KIND_VALUES = ['single', 'co', 'other'] as const;

export type OwnershipKind = (typeof OWNERSHIP_KIND_VALUES)[number];
