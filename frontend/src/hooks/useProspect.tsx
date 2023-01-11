import prospectService from '../services/prospect.service';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Prospect } from '../models/Prospect';
import { useLocation } from 'react-router-dom';

export function useProspect(initialValue?: Prospect) {
  // Get the hash value without "#"
  const link = useLocation().hash.slice(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prospect, setProspect] = useState<Prospect | undefined>(initialValue);

  const upsertProspect = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const prospect = await prospectService.upsert(link);
      setProspect(prospect);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [link]);

  const linkExists = useMemo<boolean>(
    () => !loading && !!prospect,
    [loading, prospect]
  );

  useEffect(() => {
    if (!prospect) {
      upsertProspect();
    }
  }, [prospect, upsertProspect]);

  return {
    error,
    linkExists,
    loading,
    prospect,
  };
}
