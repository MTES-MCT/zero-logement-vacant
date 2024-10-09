export const EVENT_CATEGORY_VALUES = [
  'Ownership',
  'Followup',
  'Diagnostic',
  'Campaign',
  'Group',
  'Trade'
] as const;

export type EventCategory = (typeof EVENT_CATEGORY_VALUES)[number];
