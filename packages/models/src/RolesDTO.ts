export enum RolesDTO {
  Usual,
  Admin,
  Visitor = 2
}

export const ROLE_VALUES = Object.values(RolesDTO).filter(
  (role) => typeof role === 'number'
);
