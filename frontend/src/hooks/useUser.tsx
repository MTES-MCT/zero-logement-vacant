import { useSelector } from 'react-redux';
import { ApplicationState } from '../store/reducers/applicationReducers';
import { UserRoles } from '../models/User';
import { useMemo } from 'react';

export const useUser = () => {
  const { authUser } = useSelector(
    (state: ApplicationState) => state.authentication
  );

  const isAuthenticated = useMemo<boolean>(
    () =>
      authUser?.accessToken !== undefined &&
      authUser?.establishment !== undefined &&
      authUser?.user !== undefined,
    [authUser]
  );

  const isAdmin = useMemo<boolean>(
    () => isAuthenticated && authUser.user.role === UserRoles.Admin,
    [authUser]
  );

  return {
    isAdmin,
    isAuthenticated,
  };
};
