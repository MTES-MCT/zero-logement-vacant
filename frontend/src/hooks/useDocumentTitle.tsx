import { useTitle } from 'react-use';

export function useDocumentTitle(title?: string) {
  useTitle(title ? `${title} — Zéro Logement Vacant` : 'Zéro Logement Vacant');
}
