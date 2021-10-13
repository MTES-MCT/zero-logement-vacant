import { Owner } from '../src/models/Owner';
import { Housing, HousingDetails } from '../src/models/Housing';
import { User } from '../src/models/User';

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

export function genNumber(length: number = 10) {
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

export function genOwner() {
    return {
        id: randomstring.generate(),
        address: [
            randomstring.generate(),
            randomstring.generate()
        ],
        fullName: randomstring.generate(),
        birthDate: new Date(),
        email: genEmail(),
        phone: randomstring.generate()
    } as Owner;
}

export function genHousingDetails() {
    return {
        id: randomstring.generate(),
        address: randomstring.generate(),
        municipality: randomstring.generate(),
        surface: genNumber(4),
        kind: randomstring.generate(),
        rooms: genNumber(2),
        buildingYear: genNumber(4),
        vacancyStart: genNumber(4),
    } as HousingDetails;
}

export function genHousing() {
    return {
        id: randomstring.generate(),
        address: randomstring.generate(),
        municipality: randomstring.generate(),
        ownerFullName: randomstring.generate(),
        ownerId: randomstring.generate(),
        tags: []
    } as Housing;
}
