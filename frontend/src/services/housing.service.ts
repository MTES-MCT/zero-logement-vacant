import config from '../utils/config';
import authService from './auth.service';


const listHousing = async () => {

    return await fetch(`${config.apiEndpoint}/api/housing`, {
        headers: { ...authService.authHeader() }
    })
        .then((response) => {
            return response.json();
        })
        .catch((error) => console.error(error));
};

const housingService = {
    listHousing
};

export default housingService;
