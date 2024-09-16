import { EventKind } from './EventKind';
import { EventCategory } from './EventCategory';
import { EventSection } from './EventSection';
import { UserDTO } from './UserDTO';

export interface EventDTO<T> {
  id: string;
  name: string;
  kind: EventKind;
  category: EventCategory;
  section: EventSection;
  conflict?: boolean;
  old?: T;
  new?: T;
  createdAt: Date;
  createdBy: string;
  creator?: UserDTO;
}
