import { Owner } from '../src/models/Owner';
import { Housing } from '../src/models/Housing';
import { User } from '../src/models/User';
import { Address } from '../src/models/Address';
import { Campaign, CampaignKinds } from '../src/models/Campaign';
import { initialFilters } from '../src/store/reducers/housingReducer';
import { PaginatedResult } from '../src/models/PaginatedResult';

const randomstring = require('randomstring');

export function genEmail() {
    return randomstring.generate({
        length: 10,
        charset: 'alphabetic'
    }) + '@' + randomstring.generate({
        length: 10,
        charset: 'alphabetic'
    }) ;
}

export function genNumber(length = 10) {
    return randomstring.generate({
        length,
        charset: 'numeric'
    });
}

export function genUser() {
    return {
        email: genEmail(),
        accessToken: randomstring.generate()
    } as User;
}

export function genAddress() {
    return {
        houseNumber: genNumber(2),
        street: randomstring.generate(),
        postalCode: genNumber(5),
        city: randomstring.generate()
    } as Address;
}

export function genOwner() {
    return {
        id: randomstring.generate(),
        rawAddress: [
            randomstring.generate(),
            randomstring.generate()
        ],
        fullName: randomstring.generate(),
        birthDate: new Date(),
        email: genEmail(),
        phone: randomstring.generate()
    } as Owner;
}

export function genHousing() {
    return {
        id: randomstring.generate(),
        invariant: randomstring.generate(),
        rawAddress: [
            randomstring.generate(),
            randomstring.generate()
        ],
        address: genAddress(),
        owner: genOwner(),
        livingArea: genNumber(4),
        housingKind: randomstring.generate(),
        roomsCount: genNumber(1),
        buildingYear: genNumber(4),
        vacancyStartYear: genNumber(4),
        campaignIds: []
    } as Housing;
}


export function genCampaign() {
    return {
        id: randomstring.generate(),
        campaignNumber: genNumber(1),
        startMonth: '2201',
        kind: CampaignKinds.Initial,
        name: randomstring.generate(),
        filters: initialFilters,
        createdAt: new Date(),
        housingCount: genNumber(2),
        ownerCount: genNumber(2)
    } as Campaign;
}

export function genPaginatedResult<T>(results: Array<T>) {
    return {
        totalCount: genNumber(2),
        entities: results,
        page: 1,
        perPage: 10
    } as PaginatedResult<T>
}
