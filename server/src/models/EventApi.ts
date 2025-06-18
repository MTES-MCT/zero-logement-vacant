import { EventDTO, EventType } from '@zerologementvacant/models';
import { assert } from 'ts-essentials';

import { fromUserDTO, toUserDTO, UserApi } from '~/models/UserApi';

export type EventApi<Type extends EventType> = Omit<
  EventDTO<Type>,
  'creator'
> & {
  creator?: UserApi;
};

export function fromEventDTO<Type extends EventType>(
  event: EventDTO<Type>
): EventApi<Type> {
  return {
    ...event,
    creator: event.creator ? fromUserDTO(event.creator) : undefined
  };
}

export function toEventDTO<Type extends EventType>(
  event: EventApi<Type>
): EventDTO<Type> {
  return {
    ...event,
    creator: event.creator ? toUserDTO(event.creator) : undefined
  };
}

/**
 * Expands a type union to a union of types.
 * @example
 * type HousingEvents = EventUnion<'housing:created' | 'housing:status-updated'>
 * // = EventApi<'housing:created'> | EventApi<'housing:status-updated'>
 */
export type EventUnion<Type extends EventType> = Type extends any
  ? EventApi<Type>
  : never;

export type HousingEventApi = EventUnion<
  'housing:created' | 'housing:occupancy-updated' | 'housing:status-updated'
> & {
  housingGeoCode: string;
  housingId: string;
};

export type PrecisionHousingEventApi = EventUnion<
  'housing:precision-attached' | 'housing:precision-detached'
> & {
  housingGeoCode: string;
  housingId: string;
  precisionId: string | null;
};

export type HousingOwnerEventApi = EventUnion<
  'housing:owner-attached' | 'housing:owner-updated' | 'housing:owner-detached'
> & {
  housingGeoCode: string;
  housingId: string;
  ownerId: string | null;
};

export type PerimeterHousingEventApi = EventUnion<
  'housing:perimeter-attached' | 'housing:perimeter-detached'
> & {
  housingGeoCode: string;
  housingId: string;
  perimeterId: string | null;
};

export type GroupHousingEventApi = EventUnion<
  | 'housing:group-attached'
  | 'housing:group-detached'
  | 'housing:group-removed'
  | 'housing:group-archived'
> & {
  housingGeoCode: string;
  housingId: string;
  groupId: string | null;
};

export type CampaignHousingEventApi = EventUnion<
  | 'housing:campaign-attached'
  | 'housing:campaign-detached'
  | 'housing:campaign-removed'
> & {
  housingGeoCode: string;
  housingId: string;
  campaignId: string | null;
};

export type OwnerEventApi = EventUnion<'owner:created' | 'owner:updated'> & {
  ownerId: string;
};

export type CampaignEventApi = EventUnion<'campaign:updated'> & {
  campaignId: string;
};

export function isUserModified(event: EventApi<EventType>): boolean {
  assert(event.creator, 'Event creator is missing');
  const isBeta = /@(zerologementvacant\.)?beta\.gouv\.fr$/;
  return !isBeta.test(event.creator.email);
}
