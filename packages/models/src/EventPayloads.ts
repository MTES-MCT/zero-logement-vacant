import { CampaignStatus } from './CampaignDTO';
import { DataFileYear } from './DataFileYear';
import { OwnerRank } from './HousingOwnerDTO';
import { HousingStatus } from './HousingStatus';
import { Occupancy } from './Occupancy';
import { PrecisionCategory } from './Precision';

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
type UpdateEventChange<T> = EventChange<T, T>;

type RemoveEventChange<T> = EventChange<T, null>;

export type EventPayloads = {
  'housing:created': CreationEventChange<{
    source: 'datafoncier-manual' | DataFileYear;
  }>;
  'housing:occupancy-updated': UpdateEventChange<{
    occupancy?: Occupancy;
    occupancyIntended?: Occupancy | null;
  }>;
  'housing:status-updated': UpdateEventChange<{
    // TODO: change this to a string union type ?
    status?: HousingStatus;
    subStatus?: string | null;
  }>;

  'housing:precision-attached': CreationEventChange<{
    category: PrecisionCategory;
    label: string;
  }>;
  'housing:precision-detached': RemoveEventChange<{
    category: PrecisionCategory;
    label: string;
  }>;

  'housing:owner-attached': CreationEventChange<{
    name: string;
    rank: OwnerRank;
  }>;
  'housing:owner-updated': UpdateEventChange<{
    name: string;
    rank: OwnerRank;
  }>;
  'housing:owner-detached': RemoveEventChange<{
    name: string;
    rank: OwnerRank;
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
  'housing:group-archived': RemoveEventChange<{
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
  'housing:campaign-removed': RemoveEventChange<{
    name: string;
  }>;

  'owner:updated': UpdateEventChange<{
    name: string;
    birthdate?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    additionalAddress?: string | null;
  }>;

  'campaign:updated': UpdateEventChange<{
    status?: CampaignStatus;
    title?: string;
    description?: string;
  }>;
};
