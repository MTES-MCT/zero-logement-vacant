import { useTitle } from 'react-use';

export function useDocumentTitle(title?: string) {
  useTitle(title ? `Zéro Logement Vacant - ${title}` : 'Zéro Logement Vacant');
}
