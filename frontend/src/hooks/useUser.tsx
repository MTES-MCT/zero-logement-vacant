import { UserRoles } from '../models/User';
import { useMemo } from 'react';
import { useAppSelector } from './useStore';

export const useUser = () => {
  const { authUser, } = useAppSelector((state) => state.authentication);

  const isAuthenticated = useMemo<boolean>(
    () =>
      authUser !== undefined &&
      authUser?.accessToken !== undefined &&
      authUser?.establishment !== undefined &&
      authUser?.user !== undefined,
    [authUser]
  );

  const isAdmin = useMemo<boolean>(
    () => isAuthenticated && authUser?.user.role === UserRoles.Admin,
    [authUser, isAuthenticated]
  );

  const isVisitor = useMemo<boolean>(
    () => isAuthenticated && authUser?.user.role === UserRoles.Visitor,
    [authUser, isAuthenticated]
  );

  const user = authUser?.user;
  const establishment = authUser?.establishment;

  function displayName(): string {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }

    if (user?.email) {
      return user.email;
    }

    return '';
  }

  return {
    displayName,
    establishment,
    isAdmin,
    isVisitor,
    isAuthenticated,
    user,
  };
};
