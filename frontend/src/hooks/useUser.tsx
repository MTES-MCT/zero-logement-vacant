import { UserRoles } from '../models/User';
import { useMemo } from 'react';
import { useAppSelector } from './useStore';

export const useUser = () => {
  const { authUser } = useAppSelector((state) => state.authentication);

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

  return {
    isAdmin,
    isAuthenticated,
  };
};
