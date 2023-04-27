import { UserApi, UserRoles } from '../models/UserApi';
import { OwnerApi } from '../models/OwnerApi';
import { AddressApi } from '../models/AddressApi';
import { v4 as uuidv4 } from 'uuid';
import { EstablishmentApi } from '../models/EstablishmentApi';
import { addHours, formatISO } from 'date-fns';
import {
  EnergyConsumptionGradesApi,
  HousingApi,
  OccupancyKindApi,
  OwnershipKindsApi,
} from '../models/HousingApi';
import { CampaignApi } from '../models/CampaignApi';
import { GeoPerimeterApi } from '../models/GeoPerimeterApi';
import { ProspectApi } from '../models/ProspectApi';
import {
  RESET_LINK_EXPIRATION,
  RESET_LINK_LENGTH,
  ResetLinkApi,
} from '../models/ResetLinkApi';
import { ContactPointApi } from '../models/ContactPointApi';
import {
  SIGNUP_LINK_EXPIRATION,
  SIGNUP_LINK_LENGTH,
  SignupLinkApi,
} from '../models/SignupLinkApi';
import { LocalityApi, TaxKindsApi } from '../models/LocalityApi';
import { OwnerProspectApi } from '../models/OwnerProspectApi';
import { SettingsApi } from '../models/SettingsApi';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { NoteCreationDTO } from '../../shared/models/NoteDTO';

const randomstring = require('randomstring');

export const genEmail = () => {
  return (
    randomstring.generate({
      length: 10,
      charset: 'alphabetic',
    }) +
    '@' +
    randomstring.generate({
      length: 10,
      charset: 'alphabetic',
    }) +
    '.' +
    randomstring.generate({
      length: 2,
      charset: 'alphabetic',
    })
  );
};

export const genGeoCode = () => {
  return randomstring.generate({
    length: 5,
    charset: 'numeric',
  });
};

export const genNumber = (length = 10) => {
  return Number(
    randomstring.generate({
      length,
      charset: 'numeric',
    })
  );
};

export const genBoolean = () => Math.random() < 0.5;

export const genSiren = () => genNumber(9);

export const genLocalityApi = (geoCode = genGeoCode()) => {
  return <LocalityApi>{
    id: uuidv4(),
    geoCode,
    name: randomstring.generate(),
    taxKind: TaxKindsApi.None,
  };
};

export const genEstablishmentApi = (...geoCodes: string[]) => {
  return <EstablishmentApi>{
    id: uuidv4(),
    name: randomstring.generate(),
    siren: genSiren(),
    geoCodes,
  };
};

export const genUserApi = (establishmentId: string) => {
  return <UserApi>{
    id: uuidv4(),
    email: genEmail(),
    password: randomstring.generate(),
    firstName: randomstring.generate(),
    lastName: randomstring.generate(),
    establishmentId,
    role: UserRoles.Usual,
    activatedAt: new Date(),
  };
};

export const genProspectApi = (establishment: EstablishmentApi) => {
  return <ProspectApi>{
    email: genEmail(),
    establishment: {
      id: establishment.id,
      siren: establishment.siren,
      campaignIntent: establishment.campaignIntent ?? null,
    },
    hasAccount: true,
    hasCommitment: true,
  };
};

export const genOwnerProspectApi = (geoCode?: string): OwnerProspectApi => {
  return {
    id: uuidv4(),
    email: genEmail(),
    firstName: randomstring.generate(),
    lastName: randomstring.generate(),
    address: randomstring.generate(),
    geoCode: geoCode ?? genGeoCode(),
    notes: randomstring.generate(),
    phone: randomstring.generate(),
    invariant: randomstring.generate(),
    callBack: true,
    read: false,
    createdAt: new Date(),
  };
};

export const genAddressApi = () => {
  return <AddressApi>{
    houseNumber: randomstring.generate(),
    street: randomstring.generate(),
    postalCode: randomstring.generate(),
    city: randomstring.generate(),
  };
};

export const genOwnerApi = () => {
  return <OwnerApi>{
    id: uuidv4(),
    rawAddress: [randomstring.generate(), randomstring.generate()],
    birthDate: formatISO(new Date()),
    address: genAddressApi(),
    fullName: randomstring.generate(),
    email: genEmail(),
    phone: randomstring.generate(),
  };
};

export const genHousingApi = (geoCode: string) => {
  return <HousingApi>{
    id: uuidv4(),
    invariant: randomstring.generate(),
    localId: randomstring.generate(),
    cadastralReference: randomstring.generate(),
    buildingLocation: randomstring.generate(),
    geoCode,
    rawAddress: [randomstring.generate(), randomstring.generate()],
    address: genAddressApi(),
    localityKind: randomstring.generate(),
    owner: genOwnerApi(),
    livingArea: genNumber(4),
    housingKind: randomstring.generate(),
    roomsCount: genNumber(1),
    buildingYear: genNumber(4),
    vacancyStartYear: 1000 + genNumber(3),
    dataYears: [2021],
    campaignIds: [],
    vacancyReasons: [],
    uncomfortable: false,
    cadastralClassification: genNumber(1),
    taxed: false,
    ownershipKind: OwnershipKindsApi.Single,
    buildingVacancyRate: genNumber(2),
    contactCount: genNumber(1),
    occupancy: OccupancyKindApi.Vacant,
    energyConsumption: EnergyConsumptionGradesApi.A,
    energyConsumptionWorst: EnergyConsumptionGradesApi.B,
    status: HousingStatusApi.NeverContacted,
  };
};

export const genCampaignApi = (
  establishmentId: string,
  campaignNumber: number,
  reminderNumber: number,
  createdBy: string
) => {
  return <CampaignApi>{
    id: uuidv4(),
    establishmentId,
    campaignNumber,
    reminderNumber,
    name: randomstring.generate(),
    filters: {
      geoPerimetersIncluded: [randomstring.generate()],
      geoPerimetersExcluded: [randomstring.generate()],
    },
    housingCount: genNumber(2),
    ownerCount: genNumber(2),
    kind: 1,
    createdAt: new Date(),
    createdBy,
    sendingDate: new Date(),
  };
};

export const genGeoPerimeterApi = (establishmentId: string) => {
  return <GeoPerimeterApi>{
    id: uuidv4(),
    establishmentId,
    name: randomstring.generate(),
    kind: randomstring.generate(),
  };
};

export const genNoteCreationDTO = (): NoteCreationDTO => ({
  title: randomstring.generate(),
  content: randomstring.generate(),
  contactKind: randomstring.generate(),
  housingIds: [uuidv4()],
  ownerId: uuidv4(),
});

export const genResetLinkApi = (userId: string) => {
  return <ResetLinkApi>{
    id: randomstring.generate({
      length: RESET_LINK_LENGTH,
      charset: 'alphanumeric',
    }),
    userId,
    createdAt: new Date(),
    expiresAt: addHours(new Date(), RESET_LINK_EXPIRATION),
    usedAt: null,
  };
};

export const genSignupLinkApi = (prospectEmail: string): SignupLinkApi => ({
  id: randomstring.generate({
    length: SIGNUP_LINK_LENGTH,
    charset: 'alphanumeric',
  }),
  prospectEmail,
  expiresAt: addHours(new Date(), SIGNUP_LINK_EXPIRATION),
});

export const genContactPointApi = (establishmentId: string) => {
  return <ContactPointApi>{
    id: uuidv4(),
    establishmentId,
    title: randomstring.generate(),
    opening: randomstring.generate(),
    address: randomstring.generate(),
    email: genEmail(),
    geoCodes: [genGeoCode()],
  };
};

export const genSettingsApi = (establishmentId: string): SettingsApi => {
  return {
    id: uuidv4(),
    establishmentId,
    contactPoints: {
      public: genBoolean(),
    },
    inbox: {
      enabled: true,
    },
  };
};
