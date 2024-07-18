import {
  EventCategory,
  EventKind,
  EventSection
} from '@zerologementvacant/models';

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
}
