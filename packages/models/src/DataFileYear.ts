export const DATA_FILE_YEAR_VALUES = [
  'ff-2023-locatif',
  'lovac-2019',
  'lovac-2020',
  'lovac-2021',
  'lovac-2022',
  'lovac-2023',
  'lovac-2024',
  'lovac-2025'
] as const;

export type DataFileYear = (typeof DATA_FILE_YEAR_VALUES)[number];
