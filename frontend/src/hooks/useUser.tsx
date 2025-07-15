import { UserRole } from '@zerologementvacant/models';
import { useAppSelector } from './useStore';

export const useUser = () => {
  const { logIn } = useAppSelector((state) => state.authentication);
  const { data, error, isError, isLoading, isUninitialized, isSuccess } = logIn;
  const establishment = data?.establishment;
  const user = data?.user;
  const jimoData = data?.jimoData;

  const isAuthenticated =
    !!data?.accessToken && !!data?.user && !!data?.establishment;

  const isAdmin = isAuthenticated && user?.role === UserRole.ADMIN;
  const isGuest = !isAuthenticated;
  const isUsual = isAuthenticated && user?.role === UserRole.USUAL;
  const isVisitor = isAuthenticated && user?.role === UserRole.VISITOR;

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
    user,
    isAdmin,
    isAuthenticated,
    isGuest,
    isUsual,
    isVisitor,
    error,
    isError,
    isLoading,
    isUninitialized,
    isSuccess,
    jimoData
  };
};
