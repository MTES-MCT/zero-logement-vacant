import config from '../utils/config';
import { HousingStatusCount } from '../models/HousingState';


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

const getHousingInProgressWithSupportCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/inprogress-with-support/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getHousingInProgressWithoutSupportCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/inprogress-without-support/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getHousingExitWithSupportCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/exit-with-support/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getHousingExitWithoutSupportCount = async (): Promise<number> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/exit-without-support/count`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(_ => _.json());
};

const getHousingByStatusCount = async (): Promise<HousingStatusCount> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/status/count`, {
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
    getHousingInProgressWithSupportCount,
    getHousingInProgressWithoutSupportCount,
    getHousingExitWithSupportCount,
    getHousingExitWithoutSupportCount,
    getHousingByStatusCount
};

export default statisticService;
