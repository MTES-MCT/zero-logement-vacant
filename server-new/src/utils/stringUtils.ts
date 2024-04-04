export const reduceStringArray = (stringArray?: (string | undefined)[]) => {
  return stringArray?.filter((_) => _).join(String.fromCharCode(10));
};

export const capitalize = (string?: string) => {
  return string
    ? string.charAt(0).toUpperCase() + string.slice(1).toLowerCase()
    : string;
};
