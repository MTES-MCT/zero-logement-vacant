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
