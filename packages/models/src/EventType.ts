import { EventPayloads } from './EventPayloads';

export type EventType = keyof EventPayloads;
export const EVENT_TYPE_VALUES = [
  'housing:created',
  'housing:occupancy-updated',
  'housing:status-updated',
  'housing:precision-attached',
  'housing:precision-detached',
  'housing:owner-attached',
  'housing:owner-updated',
  'housing:owner-detached',
  'housing:group-attached',
  'housing:group-detached',
  'housing:group-removed',
  'housing:campaign-attached',
  'housing:campaign-detached',
  'housing:campaign-removed',
  'owner:updated',
  'campaign:status-updated'
] as const satisfies ReadonlyArray<EventType>;
