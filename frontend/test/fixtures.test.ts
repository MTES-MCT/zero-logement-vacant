import { Owner } from '../src/models/Owner';
import { Housing, OwnershipKinds } from '../src/models/Housing';
import { AuthUser, User } from '../src/models/User';
import { Campaign } from '../src/models/Campaign';
import { initialHousingFilters } from '../src/store/reducers/housingReducer';
import { PaginatedResult } from '../src/models/PaginatedResult';
import { SignupLink } from '../src/models/SignupLink';
import { SIGNUP_LINK_EXPIRATION } from '../../server/models/SignupLinkApi';
import { addHours } from 'date-fns';
import { Prospect } from '../src/models/Prospect';
import { genBoolean, genSiren } from '../../server/test/testFixtures';
import { LocalityKinds } from '../src/models/Locality';

const randomstring = require('randomstring');

export function genEmail() {
  return (
    randomstring.generate({
      length: 10,
      charset: 'alphabetic',
    }) +
    '@' +
    randomstring.generate({
      length: 10,
      charset: 'alphabetic',
    })
  );
}

export function genNumber(length = 10) {
  return randomstring.generate({
    length,
    charset: 'numeric',
  });
}

export function genAuthUser() {
  return {
    accessToken: randomstring.generate(),
    user: genUser(),
    establishment: {
      id: genNumber(10),
      name: randomstring.generate(),
      localities: [],
      siren: genNumber(10),
      campaignIntent: randomstring.generate(),
    },
  } as AuthUser;
}

export function genUser() {
  return {
    email: genEmail(),
    firstName: randomstring.generate(),
    lastName: randomstring.generate(),
  } as User;
}

export function genOwner() {
  return {
    id: randomstring.generate(),
    rawAddress: [randomstring.generate(), randomstring.generate()],
    fullName: randomstring.generate(),
    birthDate: new Date(),
    email: genEmail(),
    phone: randomstring.generate(),
  } as Owner;
}

export function genHousing() {
  return {
    id: randomstring.generate(),
    invariant: randomstring.generate(),
    rawAddress: [randomstring.generate(), randomstring.generate()],
    localityKind: LocalityKinds.ACV,
    owner: genOwner(),
    livingArea: genNumber(4),
    housingKind: randomstring.generate(),
    roomsCount: genNumber(1),
    buildingYear: genNumber(4),
    vacancyStartYear: genNumber(4),
    dataYears: [2021],
    campaignIds: [],
    cadastralReference: '',
    vacancyReasons: [],
    uncomfortable: false,
    cadastralClassification: genNumber(1),
    taxed: false,
    ownershipKind: OwnershipKinds.Single,
    buildingVacancyRate: genNumber(2),
  } as Housing;
}

export function genCampaign() {
  return {
    id: randomstring.generate(),
    campaignNumber: genNumber(1),
    startMonth: '2201',
    reminderNumber: 0,
    name: randomstring.generate(),
    filters: initialHousingFilters,
    createdAt: new Date(),
    housingCount: genNumber(2),
    ownerCount: genNumber(2),
    kind: 1,
  } as Campaign;
}

export function genPaginatedResult<T>(results: Array<T>) {
  return {
    filteredCount: genNumber(2),
    entities: results,
    page: 1,
    perPage: 50,
  } as PaginatedResult<T>;
}

export function genSignupLink(email: string): SignupLink {
  return {
    id: randomstring.generate({
      length: 100,
      charset: 'alphanumeric',
    }),
    prospectEmail: email,
    expiresAt: addHours(new Date(), SIGNUP_LINK_EXPIRATION),
  };
}

export function genProspect(): Prospect {
  return {
    email: genEmail(),
    establishment: {
      id: randomstring.generate(),
      siren: genSiren(),
      campaignIntent: '0-2',
    },
    hasAccount: genBoolean(),
    hasCommitment: genBoolean(),
  };
}
