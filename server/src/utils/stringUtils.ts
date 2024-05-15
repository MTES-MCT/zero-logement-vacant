export const reduceStringArray = (stringArray?: (string | undefined)[]) => {
  return stringArray?.filter((_) => _).join(String.fromCharCode(10));
};

export const capitalize = (string?: string) => {
  return string
    ? string.charAt(0).toUpperCase() + string.slice(1).toLowerCase()
    : string;
};

export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Using regular expressions because otherwise "replace" only handles the first occurrence
    .replace(/\s+/g, '-')       // Replaces spaces with dashes
    .replace(/&/g, '-and-')     // Replaces "&" with "and"
    .replace(/[^\w-]+/g, '')   // Removes all non-alphanumeric characters or dashes
    .replace(/--+/g, '-');    // Replaces multiple consecutive dashes with a single dash
};
