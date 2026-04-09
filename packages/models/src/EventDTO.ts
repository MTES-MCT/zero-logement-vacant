import { EventPayloads } from './EventPayloads';
import { EventType } from './EventType';
import { UserDTO } from './UserDTO';

export interface EventDTO<Type extends EventType = EventType> {
  id: string;
  type: Type;
  nextOld: EventPayloads[Type]['old'];
  nextNew: EventPayloads[Type]['new'];
  createdAt: string;
  createdBy: string;
  creator?: UserDTO;
}

export type EventUnionDTO<Type extends EventType> = Type extends any
  ? EventDTO<Type>
  : never;
