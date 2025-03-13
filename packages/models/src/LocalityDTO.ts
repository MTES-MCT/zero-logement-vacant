export const LOCALITY_KIND_VALUES = ['ACV', 'PVD'] as const;

export type LocalityKind = (typeof LOCALITY_KIND_VALUES)[number];
