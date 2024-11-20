import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useSaveProspectMutation } from '../services/prospect.service';
import { Prospect } from '../models/Prospect';

interface RouterState {
  prospect?: Prospect | undefined;
}

export function useProspect() {
  // Get the hash value without "#"
  const location = useLocation<RouterState | undefined>();
  const link = location.hash.slice(1);
  const existingProspect = location.state?.prospect;

  const [saveProspect, { data, error, isLoading, isUninitialized }] =
    useSaveProspectMutation();
  const isInitialized = !isUninitialized;

  useEffect(() => {
    if (isUninitialized && !existingProspect) {
      saveProspect({ id: link });
    }
  }, [link, isUninitialized, saveProspect, existingProspect]);

  // Get the prospect from the router state if it exists, or from the API
  const prospect = existingProspect ?? data;

  const linkExists = isInitialized && !isLoading && !!prospect;

  return {
    error,
    linkExists,
    loading: isUninitialized || isLoading,
    prospect
  };
}
