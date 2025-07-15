import { OwnerDTO, OwnerEntity } from '@zerologementvacant/models';
import { Equivalence, pipe, Record, Struct } from 'effect';
import fp from 'lodash/fp';

import { EventApi } from '~/models/EventApi';

export interface OwnerApi extends OwnerDTO {
  idpersonne?: string;
  siren?: string;
  dataSource?: string;
  entity: OwnerEntity | null;
}

export function toOwnerDTO(owner: OwnerApi): OwnerDTO {
  return {
    ...fp.pick(
      [
        'id',
        'rawAddress',
        'fullName',
        'administrator',
        'email',
        'phone',
        'banAddress',
        'additionalAddress',
        'kind',
        'kindDetail',
        'createdAt',
        'updatedAt'
      ],
      owner
    ),
    birthDate: owner.birthDate?.substring(0, 'yyyy-mm-dd'.length) ?? null
  };
}

interface Diff<A> {
  before: Partial<A>;
  after: Partial<A>;
  changed: ReadonlyArray<keyof A>;
}

export function diffUpdatedOwner(
  before: EventApi<'owner:updated'>['nextOld'],
  after: EventApi<'owner:updated'>['nextNew']
): Diff<EventApi<'owner:updated'>['nextNew']> {
  const changed = pipe(
    {
      name: Equivalence.string,
      birthdate: Equivalence.strict<string | null>(),
      email: Equivalence.strict<string | null>(),
      phone: Equivalence.strict<string | null>(),
      address: Equivalence.strict<string | null>(),
      additionalAddress: Equivalence.strict<string | null>()
    },
    Record.map((equivalence: Equivalence.Equivalence<any>, key) =>
      equivalence(before[key], after[key])
    ),
    Record.filter((equals) => !equals),
    Record.keys
  ) as ReadonlyArray<keyof EventApi<'owner:updated'>['nextNew']>;

  return {
    before: Struct.pick(before, ...changed),
    after: Struct.pick(after, ...changed),
    changed
  };
}
