import { Map } from 'immutable';

import { Precision, PrecisionCategory } from '@zerologementvacant/models';

export const PRECISION_TRANSITION_MAPPING: Map<string, PrecisionCategory> = Map(
  {
    'Dispositifs > Dispositifs incitatifs': 'dispositifs-incitatifs',
    'Dispositifs > Dispositifs coercitifs': 'dispositifs-coercitifs',
    'Dispositifs > Hors dispositif public': 'hors-dispositif-public',
    'Mode opératoire > Travaux': 'travaux',
    'Mode opératoire > Occupation': 'occupation',
    'Mode opératoire > Mutation': 'mutation'
  }
);

export const VACANCY_REASON_TRANSITION_MAPPING: Map<string, PrecisionCategory> =
  Map({
    'Liés au propriétaire > Blocage involontaire': 'blocage-involontaire',
    'Liés au propriétaire > Blocage volontaire': 'blocage-volontaire',
    'Extérieurs au propriétaire > Immeuble / Environnement':
      'immeuble-environnement',
    'Extérieurs au propriétaire > Tiers en cause': 'tiers-en-cause'
  });

/**
 * @param referential
 * @param value Something like 'Dispositifs > Dispositifs incitatifs > Réserve personnelle ou pour une autre personne'
 */
export function toNewPrecision(
  referential: Precision[],
  value: string
): Precision {
  const label = value.split(' > ').slice(-1)[0];
  const valueWithoutLabel = value.split(' > ').slice(0, 2).join(' > ');
  const category =
    PRECISION_TRANSITION_MAPPING.get(valueWithoutLabel) ??
    VACANCY_REASON_TRANSITION_MAPPING.get(valueWithoutLabel);

  const precision = referential.find(
    (precision) => precision.category === category && precision.label === label
  );
  if (!precision) {
    throw new Error(
      `Precision of category ${category} and label ${label} not found`
    );
  }
  return precision;
}
