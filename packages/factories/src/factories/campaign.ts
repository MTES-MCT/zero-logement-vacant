import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  CAMPAIGN_STATUS_VALUES,
  TIME_PER_WEEK_VALUES,
  UserRole,
  type CampaignDTO,
  type UserDTO
} from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

function genDefaultUser(): UserDTO {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    position: faker.person.jobTitle(),
    timePerWeek: faker.helpers.arrayElement(TIME_PER_WEEK_VALUES),
    activatedAt: faker.date.recent().toJSON(),
    lastAuthenticatedAt: faker.date.recent().toJSON(),
    suspendedAt: null,
    suspendedCause: null,
    updatedAt: faker.date.recent().toJSON(),
    establishmentId: null,
    role: UserRole.USUAL,
    kind: null
  };
}

export function createCampaignFactory(adapter: Adapter) {
  return Factory.define<CampaignDTO>(() => ({
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    status: faker.helpers.arrayElement(CAMPAIGN_STATUS_VALUES),
    filters: {},
    createdAt: faker.date.past().toJSON(),
    createdBy: genDefaultUser(),
    sentAt: null,
    housingCount: 0,
    ownerCount: 0,
    returnCount: 0,
    returnRate: null
  })).onCreate((entity) => adapter.create('campaigns', entity));
}
