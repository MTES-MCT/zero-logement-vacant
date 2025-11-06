import { useEffect, useState } from 'react';

/**
 * A hook to know when the DSFR has loaded a modal.
 * @param id The modal id
 * @returns true when the modal is ready, false otherwise.
 */
export function useModalReady(id: string) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const dialog = document.getElementById(id);
    const observer = new MutationObserver(() => {
      setIsReady(true);
    });

    observer.observe(dialog!, {
      attributes: true,
      attributeFilter: ['data-fr-js-modal']
    });

    return () => observer.disconnect();
  }, [id]);

  return isReady;
}
