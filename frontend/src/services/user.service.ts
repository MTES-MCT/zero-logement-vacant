import config from '../utils/config';
import authService from './auth.service';
import { PaginatedResult } from '../models/PaginatedResult';
import { DraftUser, User } from '../models/User';
import { parseISO } from 'date-fns';
import { UserFilters } from '../models/UserFilters';


const listUsers = async (filters: UserFilters, page: number, perPage: number): Promise<PaginatedResult<User>> => {

    return await fetch(`${config.apiEndpoint}/api/users`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, page, perPage }),
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

const createUser = async (draftUser: DraftUser): Promise<User> => {
    return await fetch(`${config.apiEndpoint}/api/users/creation`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftUser })
    })
        .then(_ => _.json())
        .then(result => parseUser(result));
};

const removeUser = async (userId: string): Promise<void> => {
    await fetch(`${config.apiEndpoint}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
    })
}

const parseUser = (u: any): User => ({
    ...u,
    activatedAt: u.activatedAt ? parseISO(u.activatedAt) : undefined,
    activationSendAt: u.activationSendAt ? parseISO(u.activationSendAt) : undefined
} as User)

const userService = {
    listUsers,
    sendActivationMail,
    createUser,
    removeUser
};

export default userService;
