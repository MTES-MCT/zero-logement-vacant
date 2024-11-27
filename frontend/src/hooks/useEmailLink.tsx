import { useLocation } from 'react-router-dom-v5-compat';
import { useEffect, useMemo, useState } from 'react';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { useAppDispatch } from './useStore';

interface LinkService<T> {
  get(id: string): Promise<T>;
}

interface EmailLinkOptions<T> {
  service: LinkService<T>;
}

export function useEmailLink<T>(options: EmailLinkOptions<T>) {
  // Get the hash value without "#"
  const hash = useLocation().hash.slice(1);
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<T>();
  const [error, setError] = useState('');

  const exists = useMemo<boolean>(() => !!link, [link]);

  useEffect(() => {
    dispatch(showLoading());
    setLoading(true);
    options.service
      .get(hash)
      .then((link: T) => {
        setLink(link);
      })
      .catch((error) => {
        setError(error);
      })
      .finally(() => {
        dispatch(hideLoading());
        setLoading(false);
      });
  }, [dispatch, hash, options.service]);

  return {
    error,
    exists,
    hash,
    link,
    loading
  };
}
