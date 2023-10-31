export const parseDate = (date: string): Date =>
  new Date(date.split('/').reverse().join('-'));
