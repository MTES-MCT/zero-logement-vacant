import { Housing } from './Housing';
import { Owner } from './Owner';

export interface Note {
  title: string;
  content: string;
  contactKind: string;
  housingList?: Housing[];
  owner?: Owner;
}

export interface HousingNote extends Note {
  housingList: Housing[];
}

export interface OwnerNote extends Note {
  owner: Owner;
}
