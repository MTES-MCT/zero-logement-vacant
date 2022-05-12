import config from '../utils/config';


const getContactedOwnersCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/owners/contacted/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getEstablishmentsCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/establishments/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getAnswersCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/answers/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getHousingFollowedCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/followed/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getHousingSupportedCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/supported/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getHousingOutOfVacancyCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/vacancy/out/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const statisticService = {
    getContactedOwnersCount,
    getEstablishmentsCount,
    getAnswersCount,
    getHousingFollowedCount,
    getHousingSupportedCount,
    getHousingOutOfVacancyCount
};

export default statisticService;
