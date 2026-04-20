import { UserRole } from '@zerologementvacant/models';
import { useAppDispatch, useAppSelector } from './useStore';
import authenticationSlice from '~/store/reducers/authenticationReducer';
import { zlvApi } from '~/services/api.service';

export function useUser() {
  const dispatch = useAppDispatch();
  const { logIn } = useAppSelector((state) => state.authentication);
  const { data, error, isError, isLoading, isUninitialized, isSuccess } = logIn;
  const establishment = data?.establishment;
  const user = data?.user;
  const authorizedEstablishments = data?.authorizedEstablishments;

  const isAuthenticated =
    !!data?.accessToken && !!data?.user && !!data?.establishment;

  const isAdmin = isAuthenticated && user?.role === UserRole.ADMIN;
  const isGuest = !isAuthenticated;
  const isUsual = isAuthenticated && user?.role === UserRole.USUAL;
  const isVisitor = isAuthenticated && user?.role === UserRole.VISITOR;

  // USUAL users with multiple authorized establishments can change establishment
  const hasMultipleEstablishments = (authorizedEstablishments?.length ?? 0) > 1;
  const canChangeEstablishment = isAdmin || isVisitor || (isUsual && hasMultipleEstablishments);

  function displayName(): string {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }

    if (user?.email) {
      return user.email;
    }

    return '';
  }

  function logOut() {
    // Reset RTK Query cache to clear all cached data from previous user
    dispatch(zlvApi.util.resetApiState());
    dispatch(authenticationSlice.actions.logOut());
  }

  return {
    displayName,
    logOut,
    establishment,
    authorizedEstablishments,
    user,
    isAdmin,
    isAuthenticated,
    isGuest,
    isUsual,
    isVisitor,
    canChangeEstablishment,
    error,
    isError,
    isLoading,
    isUninitialized,
    isSuccess
  };
}
