import config from '../utils/config';
import { AuthUser } from '../models/User';

const login = async (email: string, password: string, establishmentId?: string): Promise<AuthUser> => {

    return fetch(`${config.apiEndpoint}/api/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, establishmentId }),
    })
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Authentication failed')
            }
        })
        .then((authUser) => {
            if (authUser.accessToken) {
                localStorage.setItem('authUser', JSON.stringify(authUser));
            }
            return authUser;
        })
};


const logout = (): void => {
    localStorage.removeItem('authUser');
};

const activateAccount = async (email: string, tokenId: string, password: string) => {

    return fetch(`${config.apiEndpoint}/api/account/activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tokenId, password }),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Account activation failed')
            }
        })
};


const authHeader = () => {
    const authUser = JSON.parse(localStorage.getItem('authUser') ?? '{}');
    return authUser && authUser.accessToken
        ? { 'x-access-token': authUser.accessToken }
        : undefined;
}

const authService = {
    login,
    logout,
    activateAccount,
    authHeader
};

export default authService;
