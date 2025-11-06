export const capitalize = (string: string) => {
  return string
    ? string.charAt(0).toUpperCase() + string.slice(1).toLowerCase()
    : string;
};

export const toTitleCase = (string: string) => {
  return string
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const displayCount = (
  totalCount: number,
  label: string,
  { capitalize, feminine }: { capitalize?: boolean; feminine?: boolean } = {
    capitalize: true,
    feminine: false
  },
  filteredCount?: number
): string => {
  if (!totalCount || totalCount === 0) {
    return `${capitalize ? 'Aucun' : 'aucun'}${feminine ? 'e' : ''} ${label}`;
  }

  if (totalCount === 1) {
    return `${capitalize ? 'Un' : 'un'}${feminine ? 'e' : ''} ${label}`;
  }

  if (filteredCount !== undefined && filteredCount !== totalCount) {
    return `${filteredCount} ${label
      .split(' ')
      .map((_) => pluralize(filteredCount)(_))
      .join(' ')} ${pluralize(filteredCount)(
      'filtré'
    )} sur un total de ${displayCount(totalCount, label)}`;
  }

  return `${totalCount} ${label
    .split(' ')
    .map((_) => `${_}s`)
    .join(' ')}`;
};

export function pluralize(
  count: number,
  replacements?: { old: string; new: string }[]
) {
  return (str: string): string =>
    str
      .split(' ')
      .map((s) =>
        count > 1 ? (replacements?.find((_) => _.old === s)?.new ?? `${s}s`) : s
      )
      .join(' ');
}

export function prepend(prefix: string) {
  return (str: string) => `${prefix}${str}`;
}

export function prependIf(condition: boolean) {
  return (prefix: string) => {
    return (str: string) => (condition ? prepend(prefix)(str) : str);
  };
}

export const mailto = (email: string): string => `mailto:${email}`;

export function initials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export const reduceStringArray = (
  stringArray?: (string | undefined)[],
  breakLine = true
) => {
  return stringArray
    ?.filter((_) => _)
    .join(breakLine ? String.fromCharCode(10) : ' ');
};

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(price);
}
