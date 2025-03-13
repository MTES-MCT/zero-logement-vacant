import { retry } from 'async';
import { useEffect } from 'react';
import { createGlobalState } from 'react-use';

const useIsReady = createGlobalState(false);

export function useIsDsfrReady(id: string) {
  const [ready, setReady] = useIsReady();

  useEffect(() => {
    retry({ times: 10, interval: 500 }, async () => {
      const dialog = document.getElementById(id);
      // @ts-expect-error: Property 'dsfr' does not exist on type 'Window & typeof globalThis'.ts(2339)
      return !!window.dsfr(dialog).modal;
    })
      .then(() => {
        setReady(true);
      })
      .catch((error) => {
        console.log(error);
      });

    return () => setReady(false);
  }, [id, setReady]);

  return ready;
}
