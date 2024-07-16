export enum OwnershipKind {
  SINGLE = 'single',
  CO_OWNERSHIP = 'co',
  OTHER = 'other',
}

export const OWNERSHIP_KINDS: OwnershipKind[] = Object.values(OwnershipKind);
