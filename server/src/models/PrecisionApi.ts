import { Precision, PrecisionCategory } from '@zerologementvacant/models';
import { Map, OrderedMap } from 'immutable';

export interface PrecisionApi extends Precision {
  order: number;
}

export function toPrecisionDTO(precision: PrecisionApi): Precision {
  return {
    id: precision.id,
    label: precision.label,
    category: precision.category
  };
}

export const PRECISION_TREE_VALUES: OrderedMap<
  string,
  ReadonlyArray<Precision['label']>
> = OrderedMap({
  // Dispositifs
  'dispositifs-incitatifs': [
    'Conventionnement avec travaux',
    'Conventionnement sans travaux',
    'Aides locales travaux',
    'Aides à la gestion locative',
    'Intermédiation Locative (IML)',
    'Dispositif fiscal',
    'Prime locale vacance',
    'Prime vacance France Ruralités',
    'Ma Prime Renov',
    'Prime Rénovation Globale',
    'Prime locale rénovation énergétique',
    'Accompagnement à la vente',
    'Autre'
  ],
  'dispositifs-coercitifs': [
    'RHI - THIRORI',
    'Bien sans maître',
    'Abandon manifeste',
    'DIA - préemption',
    'Procédure d’habitat indigne',
    'Permis de louer',
    'Permis de diviser',
    'Autre'
  ],
  'hors-dispositif-public': [
    'Accompagné par un professionnel (architecte, agent immobilier, etc.)',
    'Propriétaire autonome'
  ],

  // Points de blocage
  'blocage-involontaire': [
    'Mise en location ou vente infructueuse',
    'Succession en cours',
    'Défaut d’entretien / Nécessité de travaux',
    'Problème de financement / Dossier non-éligible',
    'Manque de conseils en amont de l’achat',
    'En incapacité (âge, handicap, précarité ...)'
  ],
  'blocage-volontaire': [
    'Réserve personnelle ou pour une autre personne',
    'Stratégie de gestion',
    'Mauvaise expérience locative',
    'Montants des travaux perçus comme trop importants',
    'Refus catégorique, sans raison'
  ],
  'immeuble-environnement': [
    'Pas d’accès indépendant',
    'Immeuble dégradé',
    'Ruine / Immeuble à démolir',
    'Nuisances à proximité',
    'Risques Naturels / Technologiques'
  ],
  'tiers-en-cause': [
    'Entreprise(s) en défaut',
    'Copropriété en désaccord',
    'Expertise judiciaire',
    'Autorisation d’urbanisme refusée / Blocage ABF',
    'Interdiction de location'
  ],

  // Évolutions du logement
  travaux: ['À venir', 'En cours', 'Terminés'],
  occupation: ['À venir', 'En cours', 'Nouvelle occupation'],
  mutation: ['À venir', 'En cours', 'Effectuée']
});

export const PRECISION_TRANSITION_MAPPING: Map<
  PrecisionCategory,
  ReadonlyArray<string>
> = Map({
  'dispositifs-incitatifs': ['Dispositifs', 'Dispositifs incitatifs'],
  'dispositifs-coercitifs': ['Dispositifs', 'Dispositifs coercitifs'],
  'hors-dispositif-public': ['Dispositifs', 'Hors dispositif public'],
  travaux: ['Mode opératoire', 'Travaux'],
  occupation: ['Mode opératoire', 'Occupation'],
  mutation: ['Mode opératoire', 'Mutation']
});

export const VACANCY_REASON_TRANSITION_MAPPING: Map<
  PrecisionCategory,
  ReadonlyArray<string>
> = Map({
  'blocage-involontaire': ['Liés au propriétaire', 'Blocage involontaire'],
  'blocage-volontaire': ['Liés au propriétaire', 'Blocage volontaire'],
  'immeuble-environnement': [
    'Extérieurs au propriétaire',
    'Immeuble / Environnement'
  ],
  'tiers-en-cause': ['Extérieurs au propriétaire', 'Tiers en cause']
});

export function wasPrecision(category: PrecisionCategory): boolean {
  return PRECISION_TRANSITION_MAPPING.has(category);
}

export function wasVacancyReason(category: PrecisionCategory): boolean {
  return VACANCY_REASON_TRANSITION_MAPPING.has(category);
}

export function toOldPrecision(precision: PrecisionApi): string {
  const mapping =
    PRECISION_TRANSITION_MAPPING.get(precision.category) ??
    VACANCY_REASON_TRANSITION_MAPPING.get(precision.category);
  if (!mapping) {
    throw new Error(`No mapping found for category ${precision.category}`);
  }

  return mapping.concat(precision.label).join(' > ');
}
