import { EventDTO } from '@zerologementvacant/models';

import { fromUserDTO, User } from './User';

export type Event<T = any> = Omit<EventDTO<T>, 'creator'> & {
  creator: User;
};

export function fromEventDTO<T>(event: EventDTO<T>): Event<T> {
  if (!event.creator) {
    throw new Error('Event creator is missing');
  }

  return {
    ...event,
    creator: fromUserDTO(event.creator)
  };
}
