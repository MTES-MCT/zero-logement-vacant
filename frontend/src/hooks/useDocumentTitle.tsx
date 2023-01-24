import { useEffect } from 'react';

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title
      ? `Zéro Logement Vacant - ${title}`
      : 'Zéro Logement Vacant';
  });
}
