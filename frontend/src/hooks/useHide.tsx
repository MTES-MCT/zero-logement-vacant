import { useEffect, useState } from 'react';

interface HideOptions {
  /**
   * Timeout in milliseconds.
   */
  timeout?: number;
}

const DEFAULT_TIMEOUT = 3000;

export function useHide(options?: HideOptions) {
  const opts: Required<HideOptions> = {
    timeout: options?.timeout ?? DEFAULT_TIMEOUT,
  };

  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setHidden(true);
    }, opts.timeout);
  });

  return {
    hidden,
    setHidden,
  };
}
