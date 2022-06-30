import config from '../utils/config';
import authService from './auth.service';
import { Establishment, EstablishmentData } from '../models/Establishment';
import { parseISO } from 'date-fns';
import { MonitoringFilters } from '../models/MonitoringFilters';


const listAvailableEstablishments = async (): Promise<Establishment[]> => {

    return await fetch(`${config.apiEndpoint}/api/establishments/available`, {
        method: 'GET',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' }
    })
        .then(_ => _.json())
};

const listEstablishmentData = async (filters: MonitoringFilters): Promise<EstablishmentData[]> => {

    return await fetch(`${config.apiEndpoint}/api/establishments/data`, {
        method: 'POST',
        headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters })
    })
        .then(_ => _.json())
        .then(result => result.map((e: any) => <EstablishmentData> {
            ...e,
            firstActivatedAt: e.firstActivatedAt ? parseISO(e.firstActivatedAt) : undefined,
            lastAuthenticatedAt: e.lastAuthenticatedAt ? parseISO(e.lastAuthenticatedAt) : undefined,
            lastCampaignSentAt: e.lastCampaignSentAt ? parseISO(e.lastCampaignSentAt) : undefined,
            firstCampaignSentAt: e.firstCampaignSentAt ? parseISO(e.firstCampaignSentAt) : undefined,
        }))
};

const establishmentService = {
    listAvailableEstablishments,
    listEstablishmentData
}

export default establishmentService;
