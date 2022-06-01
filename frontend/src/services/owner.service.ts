import config from '../utils/config';
import authService from './auth.service';
import { HousingOwner, Owner } from '../models/Owner';
import { parseISO } from 'date-fns';
import { toTitleCase } from '../utils/stringUtils';


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


const quickSearchService = (): {abort: () => void, fetch: (query: string) => Promise<Owner[]>} => {

    const controller = new AbortController();
    const signal = controller.signal;

    return {
        abort: () => controller.abort(),
        fetch: (query: string) => fetch(`${config.apiEndpoint}/api/owners?q=${query}`, {
            method: 'GET',
            headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
            signal
        })
            .then(_ => _.json())
            .then(result => result.map((o: any) => parseOwner(o)))
    };
};


const parseOwner = (o: any): Owner => ({
    ...o,
    rawAddress: o.rawAddress.filter((_: string) => _).map((_: string) => toTitleCase(_)),
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
    updateOwner,
    updateHousingOwners,
    quickSearchService,
    parseOwner
};

export default ownerService;
