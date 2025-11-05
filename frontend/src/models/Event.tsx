import type {
  EventDTO,
  EventHousingStatus,
  EventType
} from '@zerologementvacant/models';
import { match } from 'ts-pattern';

import { fromUserDTO, type User } from './User';

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

export function formatEventHousingStatus(status: EventHousingStatus): string {
  return match(status)
    .returnType<string>()
    .with('never-contacted', () => 'Non suivi')
    .with('waiting', () => 'En attente de retour')
    .with('first-contact', () => 'Premier contact')
    .with('in-progress', () => 'Suivi en cours')
    .with('completed', () => 'Suivi terminé')
    .with('blocked', () => 'Suivi bloqué')
    .exhaustive();
}
