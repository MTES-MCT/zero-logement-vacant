import config from '../utils/config';
import {
  HousingStatusCount,
  HousingStatusDuration,
} from '../models/HousingState';
import { MonitoringFilters } from '../models/MonitoringFilters';
import authService from './auth.service';
import { EstablishmentData } from '../models/Establishment';
import { parseISO } from 'date-fns';

const getEstablishmentsCount = async (): Promise<number> => {
  return await fetch(
    `${config.apiEndpoint}/api/statistics/establishments/count`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  ).then((_) => _.json());
};

const getContactedHousingCount = async (): Promise<number> => {
  return await fetch(
    `${config.apiEndpoint}/api/statistics/housing/contacted/count`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  ).then((_) => _.json());
};

const getWaitingHousingCount = async (): Promise<number> => {
  return await fetch(
    `${config.apiEndpoint}/api/statistics/housing/waiting/count`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  ).then((_) => _.json());
};

const getAnswersCount = async (): Promise<number> => {
  return await fetch(`${config.apiEndpoint}/api/statistics/answers/count`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }).then((_) => _.json());
};

const getHousingInProgressWithSupportCount = async (): Promise<number> => {
  return await fetch(
    `${config.apiEndpoint}/api/statistics/housing/inprogress-with-support/count`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  ).then((_) => _.json());
};

const getHousingInProgressWithoutSupportCount = async (): Promise<number> => {
  return await fetch(
    `${config.apiEndpoint}/api/statistics/housing/inprogress-without-support/count`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  ).then((_) => _.json());
};

const getHousingExitWithSupportCount = async (): Promise<number> => {
  return await fetch(
    `${config.apiEndpoint}/api/statistics/housing/exit-with-support/count`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  ).then((_) => _.json());
};

const getHousingExitWithoutSupportCount = async (): Promise<number> => {
  return await fetch(
    `${config.apiEndpoint}/api/statistics/housing/exit-without-support/count`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  ).then((_) => _.json());
};

const listEstablishmentData = async (
  filters: MonitoringFilters
): Promise<EstablishmentData[]> => {
  return await fetch(
    `${config.apiEndpoint}/api/monitoring/establishments/data`,
    {
      method: 'POST',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters }),
    }
  )
    .then((_) => _.json())
    .then((result) =>
      result.map(
        (e: any) =>
          ({
            ...e,
            firstActivatedAt: e.firstActivatedAt
              ? parseISO(e.firstActivatedAt)
              : undefined,
            lastAuthenticatedAt: e.lastAuthenticatedAt
              ? parseISO(e.lastAuthenticatedAt)
              : undefined,
            lastCampaignSendingDate: e.lastCampaignSendingDate
              ? parseISO(e.lastCampaignSendingDate)
              : undefined,
            firstCampaignSendingDate: e.firstCampaignSendingDate
              ? parseISO(e.firstCampaignSendingDate)
              : undefined,
          } as EstablishmentData)
      )
    );
};

const getHousingByStatusCount = async (
  filters: MonitoringFilters
): Promise<HousingStatusCount> => {
  return await fetch(
    `${config.apiEndpoint}/api/monitoring/housing/status/count`,
    {
      method: 'POST',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters }),
    }
  ).then((_) => _.json());
};

const getHousingByStatusDuration = async (
  filters: MonitoringFilters
): Promise<HousingStatusDuration> => {
  return await fetch(
    `${config.apiEndpoint}/api/monitoring/housing/status/duration`,
    {
      method: 'POST',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters }),
    }
  ).then((_) => _.json());
};

const exportMonitoring = async (filters: MonitoringFilters): Promise<Blob> => {
  return await fetch(`${config.apiEndpoint}/api/monitoring/export`, {
    method: 'POST',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filters }),
  }).then((_) => _.blob());
};

const monitoringService = {
  getEstablishmentsCount,
  getContactedHousingCount,
  getWaitingHousingCount,
  getAnswersCount,
  getHousingInProgressWithSupportCount,
  getHousingInProgressWithoutSupportCount,
  getHousingExitWithSupportCount,
  getHousingExitWithoutSupportCount,
  listEstablishmentData,
  getHousingByStatusCount,
  getHousingByStatusDuration,
  exportMonitoring,
};

export default monitoringService;
