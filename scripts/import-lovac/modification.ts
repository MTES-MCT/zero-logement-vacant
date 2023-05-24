export interface Modification {
  id: string;
  kind: ModificationKind;
}

export enum ModificationKind {
  OwnerUpdate = 0,
  OwnerCreation = 4,
  HousingOwnersUpdate = 5,
}

export function hasOwnershipModification(modification: Modification): boolean {
  return Object.values(ModificationKind).includes(modification.kind);
}

export function hasAnyOwnershipModification(
  modifications: Modification[]
): boolean {
  return modifications.some(hasOwnershipModification);
}
