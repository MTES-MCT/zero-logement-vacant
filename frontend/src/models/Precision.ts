import { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';

import { Precision, PrecisionCategory } from '@zerologementvacant/models';

export const PRECISION_CATEGORY_LABELS: Record<
  PrecisionCategory,
  { label: string; icon: FrIconClassName | RiIconClassName }
> = {
  'blocage-volontaire': {
    label: 'Blocage volontaire',
    icon: 'fr-icon-close-circle-fill'
  },
  'blocage-involontaire': {
    label: 'Blocage involontaire',
    icon: 'fr-icon-close-circle-line'
  },
  'dispositifs-coercitifs': {
    label: 'Dispositifs coercitifs',
    icon: 'fr-icon-scales-3-line'
  },
  'dispositifs-incitatifs': {
    label: 'Dispositifs incitatifs',
    icon: 'fr-icon-money-euro-circle-line'
  },
  'hors-dispositif-public': {
    label: 'Hors dispositif public',
    icon: 'fr-icon-more-line'
  },
  'immeuble-environnement': {
    label: 'Immeuble / Environnement',
    icon: 'fr-icon-building-line'
  },
  'tiers-en-cause': {
    label: 'Tiers en cause',
    icon: 'ri-exchange-2-line'
  },
  mutation: {
    label: 'Mutation',
    icon: 'ri-user-shared-line'
  },
  occupation: {
    label: 'Occupation',
    icon: 'ri-user-location-line'
  },
  travaux: {
    label: 'Travaux',
    icon: 'ri-barricade-line'
  }
};

export function getPrecision(precisions: Precision[]) {
  return (id: Precision['id']): Precision => {
    const precision = precisions.find((p) => p.id === id);
    if (!precision) {
      throw new Error(`Precision with id ${id} not found`);
    }

    return precision;
  };
}
