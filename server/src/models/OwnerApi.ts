import {
  OwnerDTO,
  OwnerEntity,
  type DatafoncierOwner,
  type OwnerKindLabel
} from '@zerologementvacant/models';
import { isValid } from 'date-fns';
import { Equivalence, pipe, Predicate, Record, Struct } from 'effect';
import { match } from 'ts-pattern';
import { v4 as uuidv4 } from 'uuid';

import { EventApi } from '~/models/EventApi';

export interface OwnerApi extends OwnerDTO {
  dataSource?: string;
  entity: OwnerEntity | null;
}

export function toOwnerDTO(owner: OwnerApi): OwnerDTO {
  return {
    ...Struct.pick(
      owner,
      'id',
      'idpersonne',
      'rawAddress',
      'fullName',
      'administrator',
      'email',
      'phone',
      'banAddress',
      'additionalAddress',
      'kind',
      'siren',
      'createdAt',
      'updatedAt'
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

export function fromDatafoncierOwner(
  owner: DatafoncierOwner
): Omit<OwnerApi, 'idpersonne'> & { idpersonne: string } {
  const birthdate = owner.jdatnss
    ? owner.jdatnss.split('/').reverse().join('-')
    : undefined;

  return {
    id: uuidv4(),
    idpersonne: owner.idpersonne,
    dataSource: 'ff',
    rawAddress: [owner.dlign3, owner.dlign4, owner.dlign5, owner.dlign6].filter(
      Predicate.compose(Predicate.isNotNull, (line) => line.length > 0)
    ),
    fullName:
      owner.catpro2txt === 'PERSONNE PHYSIQUE'
        ? owner.ddenom.replace('/', ' ')
        : owner.ddenom,
    birthDate:
      !!birthdate && isValid(new Date(birthdate))
        ? birthdate.substring(0, 'yyyy-mm-dd'.length)
        : null,
    kind: match(owner.catpro3)
      .returnType<OwnerKindLabel>()
      .with(
        'P1a',
        'P1b',
        'P2a',
        'P3a',
        'P4a',
        'P4b',
        'P4c',
        'P4d',
        'P5a',
        'P6a',
        'P6b',
        () => 'Etat et collectivité territoriale'
      )
      .with(
        'F1a',
        'F2a',
        'F2b',
        'F4a',
        'F4b',
        'F4c',
        'F5a',
        'F5b',
        'F7a',
        'F7c',
        'F7g',
        () => 'Bailleur social, Aménageur, Investisseur public'
      )
      .with(
        'F6a',
        'F6b',
        'F6c',
        'F7b',
        'F7d',
        'F7e',
        'F7f',
        () => 'Promoteur, Investisseur privé'
      )
      .with(
        'G1a',
        'G1b',
        'G1c',
        'G1d',
        'G2a',
        'G2b',
        'G2c',
        'G2d',
        'M1a',
        'M2a',
        'M0a',
        () => 'SCI, Copropriété, Autres personnes morales'
      )
      .with('X1a', () => 'Particulier')
      .with('999', () => 'Absence de propriétaire')
      .otherwise(() => 'Autres'),
    entity: null,
    administrator: null,
    email: null,
    phone: null,
    siren: owner.dsiren,
    banAddress: null,
    additionalAddress: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
