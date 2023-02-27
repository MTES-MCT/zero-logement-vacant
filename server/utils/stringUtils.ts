export const reduceStringArray = (stringArray?: (string | undefined)[]) => {
  return stringArray?.filter((_) => _).join(String.fromCharCode(10));
};
