import { EventKind } from '../../../shared/types/EventKind';
import { EventCategory } from '../../../shared/types/EventCategory';
import { EventSection } from '../../../shared/types/EventSection';

export interface Event {
  id: string;
  name: string;
  kind: EventKind;
  category: EventCategory;
  section: EventSection;
  contactKind?: string;
  conflict?: boolean;
  old?: any;
  new?: any;
  createdAt: Date;
  createdBy: string;
}
