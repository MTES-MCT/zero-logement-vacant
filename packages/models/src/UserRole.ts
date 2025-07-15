export enum UserRole {
  USUAL,
  ADMIN,
  VISITOR
}

export const USER_ROLE_VALUES = Object.values(UserRole).filter(
  (role) => typeof role === 'number'
);
