import { HousingApi } from '../../server/models/HousingApi';
import { Event } from './event';
import housingRepository from '../../server/repositories/housingRepository';

export interface Action {
  housing: HousingApi | null;
  events: Event<HousingApi>[];
}

export async function bulkSave(actions: Action[]): Promise<void> {
  const housingList = actions
    .map((action) => action.housing)
    .filter((housing): housing is NonNullable<HousingApi> => housing !== null);
  const events = actions.flatMap((action) => action.events);
  await Promise.all([
    housingRepository.bulkSave(housingList),
    bulkInsertEvents(events),
  ]);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function bulkInsertEvents<T>(events: Event<T>[]): Promise<void> {
  // TODO
}
