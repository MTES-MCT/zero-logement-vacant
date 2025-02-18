import { Map } from 'immutable';

import { Precision, PrecisionCategory } from '@zerologementvacant/models';

export const PRECISION_TRANSITION_MAPPING: Map<string, PrecisionCategory> = Map(
  {
    'Dispositifs > Dispositifs incitatifs': 'dispositifs-incitatifs',
    'Dispositifs > Dispositifs coercitifs': 'dispositifs-coercitifs',
    'Dispositifs > Hors dispositif public': 'hors-dispositif-public',
    'Mode opératoire > Travaux': 'travaux',
    'Mode opératoire > Location / Occupation': 'occupation',
    'Mode opératoire > Location/Occupation': 'occupation',
    'Mode opératoire > Mutation': 'mutation',
    'Liés au propriétaire > Blocage involontaire': 'blocage-involontaire',
    'Liés au propriétaire > Blocage volontaire': 'blocage-volontaire',
    'Extérieurs au propriétaire > Immeuble / Environnement':
      'immeuble-environnement',
    'Extérieurs au propriétaire > Tiers en cause': 'tiers-en-cause'
  }
);

const labelMapping: Map<string, string> = Map({
  Occupé: 'Nouvelle occupation',
  "Défaut d'entretien / nécessité de travaux":
    'Défaut d’entretien / Nécessité de travaux',
  'Défaut d’entretien / nécessité de travaux':
    'Défaut d’entretien / Nécessité de travaux',
  'En incapacité (âge, handicap, précarité...)':
    'En incapacité (âge, handicap, précarité ...)',
  'Problèmes de financements / Dossier non-éligible':
    'Problème de financement / Dossier non-éligible',
  "Pas d'accès indépendant": 'Pas d’accès indépendant',
  "Autorisation d'urbanisme refusée / Blocage ABF":
    'Autorisation d’urbanisme refusée / Blocage ABF',
  'Accompagné par un professionnel (archi, agent immo...)':
    'Accompagné par un professionnel (architecte, agent immobilier, etc.)',
  'Procédure d’habitat indigine': 'Procédure d’habitat indigne',
  "Procédure d'habitat indigne": 'Procédure d’habitat indigne',
  "Manque de conseil en amont de l'achat":
    'Manque de conseils en amont de l’achat'
});

/**
 * @param referential
 * @param value Something like 'Dispositifs > Dispositifs incitatifs > Réserve personnelle ou pour une autre personne'
 */
export function toNewPrecision(
  referential: Precision[],
  value: string
): Precision | null {
  const label = value.split(' > ').slice(-1)[0];
  const valueWithoutLabel = value.split(' > ').slice(0, 2).join(' > ');
  const categoryAfter = PRECISION_TRANSITION_MAPPING.get(valueWithoutLabel);
  const labelAfter = labelMapping.get(label) ?? label;

  const precision = referential.find(
    (precision) =>
      precision.category === categoryAfter && precision.label === labelAfter
  );
  return precision ?? null;
}
