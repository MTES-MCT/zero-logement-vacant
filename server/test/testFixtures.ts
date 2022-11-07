import { UserApi, UserRoles } from '../models/UserApi';
import { OwnerApi } from '../models/OwnerApi';
import { AddressApi } from '../models/AddressApi';
import { v4 as uuidv4 } from 'uuid';
import { EstablishmentApi, LocalityApi } from '../models/EstablishmentApi';
import { formatISO } from 'date-fns';
import { HousingApi, OwnershipKindsApi } from '../models/HousingApi';
import { CampaignApi } from '../models/CampaignApi';
import { GeoPerimeterApi } from '../models/GeoPerimeterApi';
import { ProspectApi } from '../models/ProspectApi';
const randomstring = require('randomstring');

export const genEmail = () => {
    return randomstring.generate({
        length: 10,
        charset: 'alphabetic'
    }) + '@' + randomstring.generate({
        length: 10,
        charset: 'alphabetic'
    }) + '.' + randomstring.generate({
        length: 2,
        charset: 'alphabetic'
    }) ;
}

export const genNumber = (length = 10) => {
    return Number(randomstring.generate({
        length,
        charset: 'numeric'
    }));
}

export const genBoolean = () => Math.random() < 0.5;

export const genSiren = () => genNumber(9);

export const genLocalityApi = () => {
    return <LocalityApi>{
        id: uuidv4(),
        geoCode: randomstring.generate(),
        name: randomstring.generate()
    };
}

export const genEstablishmentApi = (...localities: LocalityApi[]) => {
    return <EstablishmentApi>{
        id: uuidv4(),
        name: randomstring.generate(),
        siren: genSiren(),
        localities
    };
}

export const genUserApi = (establishmentId: string) => {
    return <UserApi>{
        id: uuidv4(),
        email: genEmail(),
        password: randomstring.generate(),
        firstName: randomstring.generate(),
        lastName: randomstring.generate(),
        establishmentId,
        role: UserRoles.Usual
    };
}

export const genProspectApi = () => {
    return <ProspectApi>{
        email: genEmail(),
        establishment: {
            id: uuidv4(),
            siren: genSiren()
        },
        hasAccount: genBoolean(),
        hasCommitment: genBoolean()
    };
}

export const genAddressApi = () => {
    return <AddressApi> {
        houseNumber: randomstring.generate(),
        street: randomstring.generate(),
        postalCode: randomstring.generate(),
        city: randomstring.generate()
    }
}

export const genOwnerApi = () => {
    return <OwnerApi>{
        id: uuidv4(),
        rawAddress: [
            randomstring.generate(),
            randomstring.generate()
        ],
        birthDate: formatISO(new Date()),
        address: genAddressApi(),
        fullName: randomstring.generate(),
        email: genEmail(),
        phone: randomstring.generate()
    };
}

export const genHousingApi = (inseeCode: string) => {
    return <HousingApi>{
        id: uuidv4(),
        invariant: randomstring.generate(),
        localId: randomstring.generate(),
        cadastralReference: randomstring.generate(),
        buildingLocation: randomstring.generate(),
        inseeCode,
        rawAddress: [
            randomstring.generate(),
            randomstring.generate()
        ],
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
        buildingVacancyRate: genNumber(2)
    };
}


export const genCampaignApi = (establishmentId: string, campaignNumber: number, reminderNumber: number, createdBy: string) => {
    return <CampaignApi>{
        id: uuidv4(),
        establishmentId,
        campaignNumber,
        startMonth: randomstring.generate(),
        reminderNumber,
        name: randomstring.generate(),
        filters: {
            geoPerimetersIncluded: [randomstring.generate()],
            geoPerimetersExcluded: [randomstring.generate()]
        },
        housingCount: genNumber(2),
        ownerCount: genNumber(2),
        kind: 1,
        createdAt: new Date(),
        createdBy
    };
}

export const genGeoPerimeterApi = (establishmentId: string) => {
    return <GeoPerimeterApi>{
        id: uuidv4(),
        establishmentId,
        name: randomstring.generate(),
        kind: randomstring.generate()
    };
}
