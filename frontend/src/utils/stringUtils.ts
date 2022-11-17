export const capitalize = (string: string) => {
    return string ? string.charAt(0).toUpperCase() + string.slice(1).toLowerCase() : string;
}

export const toTitleCase = (string: string) => {
    return string
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const displayCount = (totalCount: number, label: string, capitalize = true, count?: number) => {
    if (totalCount === 0) {
        return `${capitalize ? 'Aucun' : 'aucun'} ${label}`
    }

    if (totalCount === 1) {
        return `${capitalize ? 'Un' : 'un'} ${label}`
    }

    if (count) {
        return `${count} ${label.split(' ').map(_ => `${_}s`).join(' ')} sur un total de ${totalCount}`
    }

    return `${totalCount} ${label.split(' ').map(_ => `${_}s`).join(' ')}`
}

export function pluralize(count: number) {
    return (str: string): string => count > 1 ? `${str}s` : str
}

export const stringSort = (s1?: string, s2?: string) => s1 ? (s2 ? s1 > s2 ? 1 : -1 : 1) : (s2 ? -1 : 0)
