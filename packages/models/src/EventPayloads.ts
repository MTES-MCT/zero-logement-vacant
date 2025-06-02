import { CampaignStatus } from './CampaignDTO';
import { DataFileYear } from './DataFileYear';
import { HousingStatus } from './HousingStatus';
import { Occupancy } from './Occupancy';
import { Precision, PrecisionCategory } from './Precision';

interface EventChange<Old, New> {
  old: Old;
  new: New;
}

/**
 * Events that create a new entity, where the old value is always null.
 */
type CreationEventChange<T> = EventChange<null, T>;

/**
 * Events that update an existing entity.
 */
type UpdateEventChange<T> = EventChange<Partial<T>, Partial<T>>;

type RemoveEventChange<T> = EventChange<T, null>;

export type EventPayloads = {
  'housing:created': CreationEventChange<{
    source: 'datafoncier-manual' | DataFileYear;
  }>;
  'housing:occupancy-updated': UpdateEventChange<{
    occupancy?: Occupancy;
    occupancyIntended?: Occupancy;
  }>;
  'housing:status-updated': UpdateEventChange<{
    // TODO: change this to a string union type
    status?: HousingStatus;
    subStatus?: string | null;
  }>;

  'housing:owner-added': CreationEventChange<{
    name: string;
    birthdate?: string;
    address?: string;
  }>;
  'housing:primary-owner-updated': UpdateEventChange<{ name: string }>;
  'housing:owners-updated': UpdateEventChange<{
    owners: ReadonlyArray<{ id: string; name: string; rank: string }>;
  }>;

  'housing:perimeter-attached': CreationEventChange<{
    name: string;
  }>;
  'housing:perimeter-detached': RemoveEventChange<{
    name: string;
  }>;

  'housing:group-attached': CreationEventChange<{
    name: string;
  }>;
  'housing:group-detached': RemoveEventChange<{
    name: string;
  }>;
  'housing:group-removed': RemoveEventChange<{
    name: string;
  }>;

  'housing:campaign-attached': CreationEventChange<{
    name: string;
  }>;
  'housing:campaign-detached': RemoveEventChange<{
    name: string;
  }>;
  'housing:campaign-removed': UpdateEventChange<{
    name: string;
  }>;

  'housing:precisions-updated': UpdateEventChange<{
    precisions: ReadonlyArray<{
      id: Precision['id'];
      category: PrecisionCategory;
      label: string;
    }>;
  }>;

  'owner:updated': UpdateEventChange<{
    name?: string;
    birthdate?: string;
    email?: string;
    phone?: string;
    address?: string;
    additionalAddress?: string;
  }>;

  'campaign:status-updated': UpdateEventChange<{
    status: CampaignStatus;
  }>;
};
