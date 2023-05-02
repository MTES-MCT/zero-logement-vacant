import { Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import establishmentRepository from '../repositories/establishmentRepository';
import { getHousingStatusApiLabel } from '../models/HousingStatusApi';
import { MonitoringFiltersApi } from '../models/MonitoringFiltersApi';
import { AuthenticatedRequest, Request as JWTRequest } from 'express-jwt';
import { UserRoles } from '../models/UserApi';
import ExcelJS from 'exceljs';
import exportFileService from '../services/exportFileService';
import { constants } from 'http2';

const listEstablishmentData = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  console.log('list establishment data');

  return establishmentRepository
    .listDataWithFilters(getFiltersFromRequest(request))
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const housingByStatusCount = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  console.log('Get housing by status count');

  return housingRepository
    .countByStatusWithFilters(getFiltersFromRequest(request))
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const exportMonitoring = async (
  request: JWTRequest,
  response: Response
): Promise<Response> => {
  console.log('Export monitoring');

  const workbook = new ExcelJS.Workbook();
  const housingWorksheet = workbook.addWorksheet('Suivi général');
  const establishmentWorksheet = workbook.addWorksheet('Suivi comparatif');
  const filtersWorksheet = workbook.addWorksheet('Filtres');

  const filters = getFiltersFromRequest(request);

  establishmentWorksheet.columns = [
    { header: 'Collectivité', key: 'name' },
    { header: 'Nombre de logements vacants', key: 'housingCount' },
    { header: 'Date de première inscription', key: 'firstActivatedAt' },
    { header: 'Date de dernière connexion', key: 'lastAuthenticatedAt' },
    {
      header: 'Nombre de dossiers mis à jour dans les 30 derniers jours',
      key: 'lastMonthUpdatesCount',
    },
    { header: 'Nombre de campagnes', key: 'campaignsCount' },
    { header: 'Nombre de logements contactés', key: 'contactedHousingCount' },
    {
      header: 'Nombre de logements contactés par campagne',
      key: 'contactedHousingPerCampaign',
    },
    {
      header: "Date d'envoi de la dernière campagne",
      key: 'lastCampaignSendingDate',
    },
    {
      header: 'Temps moyen d’envoi entre 2 campagnes',
      key: 'delayBetweenCampaigns',
    },
    {
      header: "Temps d'envoi de la première campagne après inscription",
      key: 'firstCampaignSentDelay',
    },
  ];

  housingWorksheet.columns = [
    { header: 'Statut', key: 'status' },
    { header: 'Sous-statut', key: 'subStatus' },
    { header: 'Précisions', key: 'precisions' },
    { header: 'Nombre', key: 'count' },
  ];

  filtersWorksheet.columns = [
    { header: 'Filtre', key: 'filterName' },
    { header: 'Valeur', key: 'filterValue' },
  ];

  await Promise.all([
    establishmentRepository.listDataWithFilters(filters),
    housingRepository.countByStatusWithFilters(filters),
  ]).then(([establishmentDataList, counts]) => {
    establishmentDataList.forEach((data) => {
      establishmentWorksheet.addRow({
        name: data.name,
        housingCount: data.housingCount,
        firstActivatedAt: data.firstActivatedAt,
        lastAuthenticatedAt: data.lastAuthenticatedAt,
        lastMonthUpdatesCount: data.lastMonthUpdatesCount,
        campaignsCount: data.campaignsCount,
        contactedHousingCount: data.contactedHousingCount,
        contactedHousingPerCampaign: data.contactedHousingPerCampaign,
        lastCampaignSentAt: data.lastCampaignSendingDate,
        delayBetweenCampaigns: data.delayBetweenCampaigns,
        firstCampaignSentDelay: data.firstCampaignSentDelay,
      });
    });

    counts.forEach((countData, countIndex) => {
      housingWorksheet.addRow({
        status:
          counts[countIndex - 1]?.status !== countData.status
            ? getHousingStatusApiLabel(countData.status)
            : '',
        subStatus:
          counts[countIndex - 1]?.status !== countData.status ||
          counts[countIndex - 1]?.subStatus !== countData.subStatus
            ? countData.subStatus
            : '',
        precisions: countData.precisions?.join(', '),
        count: countData.count,
      });
    });

    filtersWorksheet.addRow({
      filterName: 'Etablissements',
      filterValue: filters.establishmentIds
        ?.map((id) => establishmentDataList.find((_) => _.id === id)?.name)
        ?.join(', '),
    });

    filtersWorksheet.addRow({
      filterName: 'Millésimes',
      filterValue: filters.dataYears?.join(', '),
    });
  });

  const fileName = `export_monitoring_${new Date().toDateString()}.xlsx`;

  return exportFileService.sendWorkbook(workbook, fileName, response);
};

const getFiltersFromRequest = (request: JWTRequest) => {
  const { establishmentId, role } = (request as AuthenticatedRequest).auth;

  const filters = <MonitoringFiltersApi>request.body.filters ?? {};

  return {
    ...filters,
    establishmentIds:
      role === UserRoles.Admin ? filters.establishmentIds : [establishmentId],
  };
};

const monitoringController = {
  listEstablishmentData,
  housingByStatusCount,
  exportMonitoring,
};

export default monitoringController;
