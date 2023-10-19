import { Group } from './Group';
import { HousingFilters } from './HousingFilters';

export interface GroupPayload extends Pick<Group, 'title' | 'description'> {
  housing?: {
    all: boolean;
    ids: string[];
    filters: Omit<HousingFilters, 'groupId'>;
  };
}
