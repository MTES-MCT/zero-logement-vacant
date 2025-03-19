export const CADASTRAL_CLASSIFICATION_VALUES = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8'
] as const;

export type CadastralClassification =
  (typeof CADASTRAL_CLASSIFICATION_VALUES)[number];
