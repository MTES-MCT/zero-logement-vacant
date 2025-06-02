import { EventPayloads } from './EventPayloads';

export type EventType = keyof EventPayloads;
export const EVENT_TYPE_VALUES = [
  'housing:created',
  'housing:occupancy-updated',
  'housing:status-updated',
  'housing:owner-added',
  'housing:primary-owner-updated',
  'housing:owners-updated',
  'housing:perimeter-attached',
  'housing:perimeter-detached',
  'housing:group-attached',
  'housing:group-detached',
  'housing:group-removed',
  'housing:campaign-attached',
  'housing:campaign-detached',
  'housing:campaign-removed',
  'housing:precisions-updated',
  'owner:updated',
  'campaign:status-updated'
] as const satisfies ReadonlyArray<EventType>;
