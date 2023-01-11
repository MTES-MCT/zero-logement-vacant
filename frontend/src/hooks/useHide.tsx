import { useEffect, useState } from 'react';

interface HideOptions {
  init?: boolean;
  /**
   * Timeout in milliseconds.
   */
  timeout?: number;
}

const DEFAULT_TIMEOUT = 3000;

export function useHide(options?: HideOptions) {
  const opts: Required<HideOptions> = {
    init: options?.init ?? false,
    timeout: options?.timeout ?? DEFAULT_TIMEOUT,
  };

  const [hidden, setHidden] = useState(opts.init);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHidden(true);
    }, opts.timeout);

    return function cleanup() {
      clearTimeout(timeout);
    };
  }, [opts.timeout, setHidden]);

  return {
    hidden,
    setHidden,
  };
}
