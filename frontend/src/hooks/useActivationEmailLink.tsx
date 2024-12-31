import { useGetActivationEmailQuery } from '../services/signup-link.service';

export function useActivationEmailLink(id: string) {
  const { data, isLoading, error } = useGetActivationEmailQuery(id);
  return {
    activationEmailLink: error ? null : data,
    isLoading
  };
}
