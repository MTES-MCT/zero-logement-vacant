import config from '../utils/config';
import authService from './auth.service';
import { DraftOwner, HousingOwner, Owner } from '../models/Owner';
import { parseISO } from 'date-fns';
import { toTitleCase } from '../utils/stringUtils';
import { PaginatedResult } from '../models/PaginatedResult';


const getOwner = async (id: string): Promise<Owner> => {

    return await fetch(`${config.apiEndpoint}/api/owners/${id}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(_ => parseOwner(_))
};

const listByHousing = async (housingId: string): Promise<HousingOwner[]> => {

    return await fetch(`${config.apiEndpoint}/api/owners/housing/${housingId}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(_ => _.map((_: any) => parseHousingOwner(_)))
};

const createOwner = async (draftOwner: DraftOwner) => {

    return await fetch(`${config.apiEndpoint}/api/owners/creation`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftOwner }),
    })
        .then(response => {
            if (response.status === 200) {
                return response.json();
            } else {
                throw Error("Invalid parameters")
            }
        })
};

const updateOwner = async (owner: Owner) => {

    return await fetch(`${config.apiEndpoint}/api/owners/${owner.id}`, {
        method: 'PUT',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner }),
    })
        .then(response => {
            if (response.status === 200) {
                return response.json();
            } else {
                throw Error("Invalid parameters")
            }
        })
};

const updateHousingOwners = async (housingId: string, housingOwners: HousingOwner[]) => {

    return await fetch(`${config.apiEndpoint}/api/owners/housing/${housingId}`, {
        method: 'PUT',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ housingOwners }),
    })
        .then(response => {
            if (response.status === 200) {
                return response.json();
            } else {
                throw Error("Invalid parameters")
            }
        })
};

const listOwners = async (q: string, page: number, perPage: number): Promise<PaginatedResult<Owner>> => {

    return await fetch(`${config.apiEndpoint}/api/owners`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, page, perPage }),
    })
        .then(_ => _.json())
        .then(result => ({
            ...result,
            entities: result.entities.map((e: any) => parseOwner(e))
        }));
};

const parseOwner = (o: any): Owner => ({
    ...o,
    rawAddress: o.rawAddress ? o.rawAddress.filter((_: string) => _).map((_: string) => toTitleCase(_)) : '',
    birthDate: o.birthDate ? parseISO(o.birthDate) : undefined,
    fullName: toTitleCase(o.fullName.replace(/^(MME |M )/i, '')),
    administrator: o.administrator ? toTitleCase(o.administrator) : undefined
} as Owner)

const parseHousingOwner = (o: any): HousingOwner => ({
    ...parseOwner(o),
    startDate: o.startDate ? parseISO(o.startDate) : undefined,
    endDate: o.endDate ? parseISO(o.endDate) : undefined,
} as HousingOwner)

const ownerService = {
    getOwner,
    listByHousing,
    createOwner,
    updateOwner,
    updateHousingOwners,
    listOwners,
    parseOwner
};

export default ownerService;
