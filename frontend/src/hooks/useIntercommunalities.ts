import {
  isChild,
  isDepartmentalEstablishment
} from '@zerologementvacant/models';

import { useFindEstablishmentsQuery } from '../services/establishment.service';
import { useAppSelector } from './useStore';

export function useIntercommunalities() {
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );
  const query = useFindEstablishmentsQuery(
    {
      kind: ['CA', 'CC', 'CU', 'METRO', 'EPT'] // Intercommunalities
    },
    {
      skip: establishment && !isDepartmentalEstablishment(establishment)
    }
  );
  // Filter by the current establishment’s geocodes
  const geoCodes = new Set<string>(establishment?.geoCodes);
  const intercommunalities = query.data?.filter(isChild(geoCodes));

  return { ...query, data: intercommunalities };
}
