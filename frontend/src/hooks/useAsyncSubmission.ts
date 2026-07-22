import { useCallback, useRef, useState } from 'react';

interface AsyncSubmission {
  isSubmitting: boolean;
  submit(action: () => Promise<void>): Promise<void>;
}

export function useAsyncSubmission(): AsyncSubmission {
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (action: () => Promise<void>) => {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await action();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, submit };
}
