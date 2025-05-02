import {
  EventCategory,
  EventKind,
  EventSection
} from '@zerologementvacant/models';
import { User } from './User';

export interface Event<T = any> {
  id: string;
  name: string;
  kind: EventKind;
  category: EventCategory;
  section: EventSection;
  contactKind?: string;
  conflict?: boolean;
  old?: T;
  new?: T;
  createdAt: Date;
  createdBy: string;
  creator: User;
}
