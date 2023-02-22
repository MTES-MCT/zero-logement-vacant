export const reduceStringArray = (stringArray?: (string | undefined)[]) => {
  return stringArray?.map((_) => !!_)
    ? stringArray.filter((_) => _).join(String.fromCharCode(10))
    : stringArray;
};
