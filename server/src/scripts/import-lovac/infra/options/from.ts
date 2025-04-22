export const FROM_OPTIONS_VALUES = ['file', 's3'] as const;
export type FromOptionValue = (typeof FROM_OPTIONS_VALUES)[number];
