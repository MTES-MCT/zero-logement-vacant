import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import { useAsyncSubmission } from '../useAsyncSubmission';

describe('useAsyncSubmission', () => {
  it('ignores a second submission while the first one is pending', async () => {
    let resolve!: () => void;
    const action = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        })
    );
    const { result } = renderHook(() => useAsyncSubmission());

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.submit(action);
      second = result.current.submit(action);
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolve();
      await Promise.all([first, second]);
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});
