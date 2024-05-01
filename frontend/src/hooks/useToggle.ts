import { useState } from 'react';

export function useToggle(init?: boolean) {
  const [active, setActive] = useState<boolean>(init ?? false);

  function toggle(): void {
    setActive((active) => !active);
  }

  return {
    active,
    setActive,
    toggle,
  };
}
