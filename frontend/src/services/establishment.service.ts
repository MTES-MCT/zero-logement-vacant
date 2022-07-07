import config from '../utils/config';
import authService from './auth.service';
import { Establishment } from '../models/Establishment';


const listAvailableEstablishments = async (): Promise<Establishment[]> => {

    return await fetch(`${config.apiEndpoint}/api/establishments/available`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(_ => _.json())
};

const establishmentService = {
    listAvailableEstablishments
}

export default establishmentService;
