import config from '../utils/config';



const getEstablishmentsCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/establishments/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getContactedHousingCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/contacted/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getWaitingHousingCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/waiting/count`, {
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

const getHousingFirstContactedCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/contacted/first/count`, {
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
    getEstablishmentsCount,
    getContactedHousingCount,
    getWaitingHousingCount,
    getAnswersCount,
    getHousingFirstContactedCount,
    getHousingFollowedCount,
    getHousingOutOfVacancyCount
};

export default statisticService;
