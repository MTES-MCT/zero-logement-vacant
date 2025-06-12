import { EventDTO, EventType } from '@zerologementvacant/models';
import { fromUserDTO, User } from './User';

export type Event<Type extends EventType = EventType> = Omit<
  EventDTO<Type>,
  'creator'
> & {
  creator: User;
};

export function fromEventDTO<Type extends EventType>(
  event: EventDTO<Type>
): Event<Type> {
  if (!event.creator) {
    throw new Error('Event creator is missing');
  }

  return {
    ...event,
    creator: fromUserDTO(event.creator)
  };
}
