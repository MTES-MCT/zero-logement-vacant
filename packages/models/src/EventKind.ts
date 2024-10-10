export const EVENT_KIND_VALUES = ['Create', 'Update', 'Delete'] as const;

export type EventKind = (typeof EVENT_KIND_VALUES)[number];
