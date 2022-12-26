import { useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { useDispatch } from 'react-redux';

interface LinkService<T> {
  get(id: string): Promise<T>;
}

interface EmailLinkOptions<T> {
  service: LinkService<T>;
}

export function useEmailLink<T>(options: EmailLinkOptions<T>) {
  // Get the hash value without "#"
  const hash = useLocation().hash.slice(1);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<T>();

  const exists = useMemo<boolean>(() => !!link, [link]);

  useEffect(() => {
    dispatch(showLoading());
    setLoading(true);
    options.service
      .get(hash)
      .then((link: T) => {
        setLink(link);
      })
      .finally(() => {
        dispatch(hideLoading());
        setLoading(false);
      });
  }, [dispatch, hash, options.service]);

  return {
    exists,
    hash,
    link,
    loading,
  };
}
