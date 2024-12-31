import { SignupLinkDTO } from '@zerologementvacant/models';
import { useGetUserAccessQuery } from '../services/portaildf.service';

export function useUserAccess(signupLink: SignupLinkDTO | null | undefined) {
  const { data, isLoading, error } = useGetUserAccessQuery(signupLink?.prospectEmail ?? '', {skip: !signupLink});

  return {
    access: error ? null : data,
    isLoading
  };
}
