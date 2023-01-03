import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import resetLinkService from '../services/reset-link.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { useDispatch } from 'react-redux';

export function useResetLink() {
  // Get the hash value without "#"
  const hash = useLocation().hash.slice(1);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    dispatch(showLoading());
    setLoading(true);
    resetLinkService
      .exists(hash)
      .then((exists) => {
        setExists(exists);
      })
      .finally(() => {
        dispatch(hideLoading());
        setLoading(false);
      });
  }, [dispatch, hash]);

  return {
    loading,
    exists,
    value: hash,
  };
}
