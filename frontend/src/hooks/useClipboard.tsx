import { useState } from 'react';
import { delay } from 'lodash';

interface ClipboardOptions {
  /**
   * timeout in ms
   */
  timeout?: number;
}

export function useClipboard(opts?: ClipboardOptions) {
  const options: Required<ClipboardOptions> = {
    timeout: opts?.timeout ?? 1000,
  };

  const [copied, setCopied] = useState(false);

  async function copy(data: ClipboardItems | string) {
    if (typeof data === 'string') {
      await navigator.clipboard.writeText(data);
    } else {
      await navigator.clipboard.write(data);
    }

    setCopied(true);
    delay(() => setCopied(false), options.timeout);
  }

  return {
    copied,
    copy,
  };
}
