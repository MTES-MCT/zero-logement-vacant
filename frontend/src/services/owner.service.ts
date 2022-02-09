import config from '../utils/config';
import authService from './auth.service';
import { Owner } from '../models/Owner';
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

const parseOwner = (o: any): Owner => ({
    ...o,
    rawAddress: o.rawAddress.filter((_: string) => _).map((_: string) => toTitleCase(_)),
    birthDate: o.birthDate ? parseISO(o.birthDate) : undefined,
    fullName: toTitleCase(o.fullName.replace(/^(MME |M )/i, '')),
    administrator: o.administrator ? toTitleCase(o.administrator) : undefined
} as Owner)

const ownerService = {
    getOwner,
    updateOwner,
    parseOwner
};

export default ownerService;
