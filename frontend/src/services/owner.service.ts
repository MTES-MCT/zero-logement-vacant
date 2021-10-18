import config from '../utils/config';
import authService from './auth.service';
import { Owner } from '../models/Owner';
import { parseISO } from 'date-fns';


const getOwner = async (id: string) => {

    return await fetch(`${config.apiEndpoint}/api/owners/${id}`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then((d: any) => ({
            id: d.id,
            address: d.address,
            fullName: d.fullName,
            birthDate: d.birthDate ? parseISO(d.birthDate) : undefined,
            email: d.email,
            phone: d.phone
        } as Owner))
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

const ownerService = {
    getOwner,
    updateOwner
};

export default ownerService;
