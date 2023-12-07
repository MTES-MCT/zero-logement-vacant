import { GroupDTO } from '../models/GroupDTO';

// eslint-disable-next-line @typescript-eslint/ban-types
export interface PushEvents extends Record<string, unknown> {
  'group:finalized': GroupDTO;
}
