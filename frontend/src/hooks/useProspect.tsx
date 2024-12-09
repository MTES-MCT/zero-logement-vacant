import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useSaveProspectMutation } from '../services/prospect.service';

export function useProspect() {
  // Get the hash value without "#"
  const location = useLocation();
  const link = location.hash.slice(1);

  const [saveProspect, { data: prospect, error, isLoading, isUninitialized }] =
    useSaveProspectMutation();
  const isInitialized = !isUninitialized;

  useEffect(() => {
    if (isUninitialized) {
      saveProspect({ id: link });
    }
  }, [link, isUninitialized, saveProspect]);

  const linkExists = isInitialized && !isLoading && !!prospect;

  return {
    error,
    link,
    linkExists,
    loading: isUninitialized || isLoading,
    prospect
  };
}
