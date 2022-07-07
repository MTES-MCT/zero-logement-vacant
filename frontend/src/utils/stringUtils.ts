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

export const displayCount = (housingCount: number, label: string) => {
    return housingCount === 0 ? `Aucun ${label}` :
        housingCount === 1 ? `Un ${label}` :
            `${housingCount} ${label.split(' ').map(_ => `${_}s`).join(' ')}`
}

export const stringSort = (s1?: string, s2?: string) => s1 ? (s2 ? s1 > s2 ? 1 : -1 : 1) : (s2 ? -1 : 0)
