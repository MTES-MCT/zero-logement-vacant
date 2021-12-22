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
            `${housingCount} ${label.split(' ').map(_ => `${_}s`).reduce((l1, l2) => `${l1} ${l2}`)}`
}
