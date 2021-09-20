import config from '../utils/config';

const signin = async (email: string, password: string) => {

    return fetch(`${config.apiEndpoint}/api/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Authentication failed')
            }
        })
        .then((user) => {
            if (user.accessToken) {
                localStorage.setItem('user', JSON.stringify(user));
            }
            return user;
        })
};


const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('user') ?? '{}');
    return user && user.accessToken
        ? { 'x-access-token': user.accessToken }
        : undefined;
}

const authService = {
    signin: signin,
    authHeader: authHeader
};

export default authService;
