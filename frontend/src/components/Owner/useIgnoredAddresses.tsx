import { Array, pipe } from 'effect';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'address-warning-visible';
const STORAGE_EVENT = 'address-warning-updated';

export function useIgnoredAddresses() {
  const [ignoredAddresses, setIgnoredAddresses] =
    useState<ReadonlyArray<string>>(listIgnored());

  function listIgnored(): ReadonlyArray<string> {
    return pipe(localStorage.getItem(STORAGE_KEY), (warnings) =>
      warnings ? (JSON.parse(warnings) as ReadonlyArray<string>) : []
    );
  }

  // Listen for changes from other hook instances
  useEffect(() => {
    const handleStorageUpdate = () => {
      setIgnoredAddresses(listIgnored());
    };

    window.addEventListener(STORAGE_EVENT, handleStorageUpdate);
    return () => {
      window.removeEventListener(STORAGE_EVENT, handleStorageUpdate);
    };
  }, []);

  function isIgnored(banId: string): boolean {
    return Array.contains(ignoredAddresses, banId);
  }

  function ignoreWarning(banId: string): void {
    const ignored = Array.append(ignoredAddresses, banId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ignored));
    setIgnoredAddresses(ignored);
    // Notify other hook instances
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }

  return {
    isIgnored,
    ignoreWarning
  };
}
