import { OrderedMap } from 'immutable';

import { Precision } from '@zerologementvacant/models';

export interface PrecisionApi extends Precision {
  order: number;
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
    'ORI - TIROIR',
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
    'Succession difficile, indivision en désaccord',
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
