import jwt from 'jsonwebtoken';
import { faker } from '@faker-js/faker/locale/fr';
import {
  type EventType,
  USER_ROLE_VALUES,
  UserRole
} from '@zerologementvacant/models';
import {
  genAddressDTO,
  genCampaignDTO,
  genDraftDTO,
  genEstablishmentDTO,
  genEventDTO,
  genGroupDTO,
  genHousingDTO,
  genHousingOwnerDTO,
  genNoteDTO,
  genOwnerDTO,
  genProspectDTO,
  genSenderDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { addHours } from 'date-fns';
import randomstring from 'randomstring';
import type { Address } from '../models/Address';
import { type Event, fromEventDTO } from '../models/Event';
import { type Group, fromGroupDTO } from '../models/Group';
import { type Campaign, fromCampaignDTO } from '../models/Campaign';
import type { Draft } from '../models/Draft';
import type { Housing } from '../models/Housing';
import { fromNoteDTO, type Note } from '../models/Note';
import {
  fromHousingOwnerDTO,
  fromOwnerDTO,
  type HousingOwner,
  type Owner
} from '../models/Owner';
import type { Prospect } from '../models/Prospect';
import type { SignupLink } from '../models/SignupLink';
import {
  type AuthUser,
  fromUserDTO,
  toUserDTO,
  type User
} from '../models/User';
import type { Establishment } from '~/models/Establishment';

export const genBoolean = () => Math.random() < 0.5;

export const genSiren = () => genNumber(9);

export function genEmail() {
  const name = randomstring.generate({
    length: 4,
    charset: 'alphabetic',
    readable: true
  });
  const domain = randomstring.generate({
    length: 4,
    charset: 'alphabetic',
    readable: true
  });
  return `${name}@${domain}.com`;
}

export function genNumber(length = 10): number {
  return Number(
    randomstring.generate({
      length,
      charset: 'numeric'
    })
  );
}

export function genAuthUser(
  user: User,
  establishment: Establishment
): AuthUser {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      establishmentId: establishment.id,
      role: user.role
    },
    faker.string.alphanumeric(10),
    { algorithm: 'HS256' }
  );
  return {
    accessToken,
    user,
establishment
  };
}

export function genUser(
  role: UserRole = faker.helpers.arrayElement(USER_ROLE_VALUES)
): User {
  return fromUserDTO(genUserDTO(role));
}

export function genOwner(): Owner {
  return fromOwnerDTO(genOwnerDTO());
}

export function genHousing(): Housing {
  return {
    ...genHousingDTO(),
    buildingId: null
  };
}

export function genHousingOwner(owner: Owner): HousingOwner {
  return fromHousingOwnerDTO(genHousingOwnerDTO(owner));
}

export function genAddress(): Address {
  return genAddressDTO();
}

export function genSignupLink(email: string): SignupLink {
  return {
    id: randomstring.generate({
      length: 100,
      charset: 'alphanumeric'
    }),
    prospectEmail: email,
    expiresAt: addHours(new Date(), 24 * 7)
  };
}

export function genProspect(): Prospect {
  return genProspectDTO(genEstablishmentDTO());
}

export function genGroup(): Group {
  const owner = genOwnerDTO();
  const housings = faker.helpers.multiple(
    () => ({ ...genHousingDTO(), owner }),
    { count: { min: 2, max: 5 } }
  );
  return fromGroupDTO(genGroupDTO(genUserDTO(), housings));
}

type EventOptions<Type extends EventType> = Pick<
  Event<Type>,
  'type' | 'creator' | 'nextOld' | 'nextNew'
>;
export function genEvent<Type extends EventType>(
  options: EventOptions<Type>
): Event<Type> {
  const { type, creator, nextOld, nextNew } = options;
  return fromEventDTO(
    genEventDTO<Type>({
      type: type,
      creator: toUserDTO(creator),
      nextOld: nextOld,
      nextNew: nextNew
    })
  );
}

export function genNote(creator: User): Note {
  return fromNoteDTO(genNoteDTO(toUserDTO(creator)));
}

export function genCampaign(): Campaign {
  return fromCampaignDTO(genCampaignDTO());
}

export function genDraft(): Draft {
  return genDraftDTO(genSenderDTO());
}
