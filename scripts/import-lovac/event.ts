import { User } from '../../shared/models/User';

export interface Event<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  category:
    | 'ownership'
    | 'followup'
    | 'diagnostic'
    | 'campaign'
    | 'trade'
    | 'données foncières';
  section: string;
  conflict: boolean;
  old: T;
  new: T;
  createdAt: Date;
  createdBy: User;
}
