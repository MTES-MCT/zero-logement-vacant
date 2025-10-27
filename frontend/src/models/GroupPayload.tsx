import type { Group } from './Group';
import type { HousingFilters } from './HousingFilters';

export interface GroupPayload extends Pick<Group, 'title' | 'description'> {
  housing?: {
    all: boolean;
    ids: string[];
    filters: Omit<HousingFilters, 'groupId'>;
  };
}
