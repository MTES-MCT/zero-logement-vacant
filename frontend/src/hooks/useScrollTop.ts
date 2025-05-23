import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Scroll to the top of the page on route change.
 * Does not scroll when going back.
 */
export function useScrollTop() {
  const navigationType = useNavigationType();
  const location = useLocation();

  useLayoutEffect(() => {
    if (navigationType !== 'POP') {
      window.scrollTo({ top: 0 });
    }
  }, [location, navigationType]);
}
