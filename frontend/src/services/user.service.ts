import config from '../utils/config';
import authService from './auth.service';
import { PaginatedResult } from '../models/PaginatedResult';
import { User } from '../models/User';
import { parseISO } from 'date-fns';


const listUsers = async (page: number, perPage: number): Promise<PaginatedResult<User>> => {

    return await fetch(`${config.apiEndpoint}/api/users`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, perPage }),
    })
        .then(_ => _.json())
        .then(result => ({
            ...result,
            entities: result.entities.map((e: any) => parseUser(e))
        }));
};

const sendActivationMail = async (userId: string): Promise<User> => {

    return await fetch(`${config.apiEndpoint}/api/users/${userId}/activation`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(_ => _.json())
        .then(result => parseUser(result));
};

const parseUser = (u: any): User => ({
    ...u,
    activatedAt: u.activatedAt ? parseISO(u.activatedAt) : undefined,
    activationSendAt: u.activationSendAt ? parseISO(u.activationSendAt) : undefined
} as User)

const userService = {
    listUsers,
    sendActivationMail
};

export default userService;
