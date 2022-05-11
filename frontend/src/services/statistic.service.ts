import config from '../utils/config';


const getContactedOwnersCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/owners/contacted/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const statisticService = {
    getContactedOwnersCount
};

export default statisticService;
