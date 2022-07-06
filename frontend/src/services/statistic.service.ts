import config from '../utils/config';
import { HousingStatusCount, HousingStatusDuration } from '../models/HousingState';
import { MonitoringFilters } from '../models/MonitoringFilters';


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

const getHousingByStatusCount = async (filters: MonitoringFilters): Promise<HousingStatusCount> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/status/count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
    })
        .then(_ => _.json());
};

const getHousingByStatusDuration = async (filters: MonitoringFilters): Promise<HousingStatusDuration> => {

    return await fetch(`${config.apiEndpoint}/api/statistics/housing/status/duration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
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
    getHousingByStatusCount,
    getHousingByStatusDuration
};

export default statisticService;
