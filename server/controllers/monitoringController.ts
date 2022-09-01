import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import establishmentRepository from '../repositories/establishmentRepository';
import {
    ExitWithoutSupportSubStatus,
    ExitWithPublicSupportSubStatus,
    ExitWithSupportSubStatus,
    FirstContactWithPreSupportSubStatus, getHousingStatusApiLabel,
    HousingStatusApi,
    InProgressWithoutSupportSubStatus,
    InProgressWithPublicSupportSubStatus,
    InProgressWithSupportSubStatus,
} from '../models/HousingStatusApi';
import { MonitoringFiltersApi } from '../models/MonitoringFiltersApi';
import { Request as JWTRequest } from 'express-jwt';
import { RequestUser, UserRoles } from '../models/UserApi';
import ExcelJS from 'exceljs';
import exportFileService from '../services/exportFileService';


const establishmentCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get available establishment count')

    return establishmentRepository.listAvailable()
        .then(_ => response.status(200).json(_.length));
};

const housingContactedCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get contacted housing count')

    return housingRepository.countWithFilters({status: [HousingStatusApi.Waiting, HousingStatusApi.FirstContact, HousingStatusApi.InProgress, HousingStatusApi.NotVacant, HousingStatusApi.NoAction, HousingStatusApi.Exit]})
        .then(_ => response.status(200).json(_));
};

const housingWaitingCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get waiting housing count')

    return housingRepository.countWithFilters({status: [HousingStatusApi.Waiting]})
        .then(_ => response.status(200).json(_));
};

const answersCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get answers count')

    return housingRepository.countWithFilters({status: [HousingStatusApi.FirstContact, HousingStatusApi.InProgress, HousingStatusApi.NotVacant, HousingStatusApi.NoAction, HousingStatusApi.Exit]})
        .then(_ => response.status(200).json(_));
};

const housingInProgressWithSupportCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing in progress with support count')

    return Promise.all([
        housingRepository.listWithFilters({status: [HousingStatusApi.FirstContact], subStatus: [FirstContactWithPreSupportSubStatus]}),
        housingRepository.listWithFilters({status: [HousingStatusApi.InProgress], subStatus: [InProgressWithSupportSubStatus]}),
        housingRepository.listWithFilters({status: [HousingStatusApi.InProgress], subStatus: [InProgressWithPublicSupportSubStatus]}),
    ])
        .then(([result1, result2, result3]) =>
            response.status(200).json(result1.entities.length + result2.entities.length + result3.entities.length)
        );
};

const housingInProgressWithoutSupportCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing in progress without support count')

    return housingRepository.listWithFilters({status: [HousingStatusApi.InProgress], subStatus: [InProgressWithoutSupportSubStatus]})
        .then(_ => response.status(200).json(_.entities.length))
};

const housingExitWithSupportCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing out of vacancy with support count')

    return Promise.all([
        housingRepository.listWithFilters({status: [HousingStatusApi.Exit], subStatus: [ExitWithSupportSubStatus]}),
        housingRepository.listWithFilters({status: [HousingStatusApi.Exit], subStatus: [ExitWithPublicSupportSubStatus]}),
    ])
        .then(([result1, result2]) =>
            response.status(200).json(result1.entities.length + result2.entities.length)
        );
};

const housingExitWithoutSupportCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing out of vacancy without support count')

    return housingRepository.listWithFilters({status: [HousingStatusApi.Exit], subStatus: [ExitWithoutSupportSubStatus]})
        .then(_ => response.status(200).json(
            _.entities
                .filter(housing => housing.subStatus?.length ).length
            )
        );
};

const listEstablishmentData = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('list establishment data')

    return establishmentRepository.listDataWithFilters(getFiltersFromRequest(request))
        .then(_ => response.status(200).json(_));
};

const housingByStatusCount = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('Get housing by status count')

    return housingRepository.countByStatusWithFilters(getFiltersFromRequest(request))
        .then(_ => response.status(200).json(_));
};

const housingByStatusDuration = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('Get housing by status durations')

    return housingRepository.durationByStatusWithFilters(getFiltersFromRequest(request))
        .then(_ => response.status(200).json(_));
};

const exportMonitoring = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('Export monitoring')

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
        { header: 'Nombre de dossiers mis à jour dans les 30 derniers jours', key: 'lastMonthUpdatesCount' },
        { header: 'Nombre de campagnes', key: 'campaignsCount' },
        { header: 'Nombre de logements contactés', key: 'contactedHousingCount' },
        { header: 'Nombre de logements contactés par campagne', key: 'contactedHousingPerCampaign' },
        { header: 'Date d\'envoi de la dernière campagne', key: 'lastCampaignSendingDate' },
        { header: 'Temps moyen d’envoi entre 2 campagnes', key: 'delayBetweenCampaigns' },
        { header: 'Temps d\'envoi de la première campagne après inscription', key: 'firstCampaignSentDelay' }
    ];

    housingWorksheet.columns = [
        { header: 'Statut', key: 'status' },
        { header: 'Sous-statut', key: 'subStatus' },
        { header: 'Précisions', key: 'precisions' },
        { header: 'Nombre', key: 'count' },
        { header: 'Temps moyen dans le statut', key: 'averageDuration' },
        { header: 'Dans le statut depuis plus de 3 mois', key: 'unchangedFor3MonthsCount' }
    ];

    filtersWorksheet.columns = [
        { header: 'Filtre', key: 'filterName' },
        { header: 'Valeur', key: 'filterValue' },
    ]

    await Promise.all([
        establishmentRepository.listDataWithFilters(filters),
        housingRepository.countByStatusWithFilters(filters),
        housingRepository.durationByStatusWithFilters(filters)
    ]).then(([establishmentDataList, counts, durations]) => {

        establishmentDataList.map(data => {
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
                firstCampaignSentDelay: data.firstCampaignSentDelay
            });
        });

        counts.map((countData, countIndex)  => {
            housingWorksheet.addRow({
                status : counts[countIndex - 1]?.status !== countData.status ? getHousingStatusApiLabel(countData.status) : '',
                subStatus : (counts[countIndex - 1]?.status !== countData.status || counts[countIndex - 1]?.subStatus !== countData.subStatus) ? countData.subStatus : '',
                precisions : countData.precisions?.join(', '),
                count : countData.count,
                averageDuration: counts[countIndex - 1]?.status !== countData.status ? durations.find(_ => _.status === countData.status)?.averageDuration : '',
                unchangedFor3MonthsCount: counts[countIndex - 1]?.status !== countData.status ? durations.find(_ => _.status === countData.status)?.unchangedFor3MonthsCount : ''
            })
        });

        filtersWorksheet.addRow({
            filterName: 'Etablissements',
            filterValue: filters.establishmentIds?.map(id => establishmentDataList.find(_ => _.id === id)?.name)?.join(', ')
        });

        filtersWorksheet.addRow({
            filterName: 'Millésimes',
            filterValue: filters.dataYears?.join(', ')
        });
    })

    const fileName = `export_monitoring_${(new Date()).toDateString()}.xlsx`;

    return exportFileService.sendWorkbook(workbook, fileName, response);
};

const getFiltersFromRequest = (request: JWTRequest) => {
    const role = (<RequestUser>request.auth).role;
    const establishmentId = (<RequestUser>request.auth).establishmentId;

    const filters = <MonitoringFiltersApi> request.body.filters ?? {};

    return {...filters, establishmentIds: role === UserRoles.Admin ? filters.establishmentIds : [establishmentId] }
}

const monitoringController =  {
    establishmentCount,
    housingContactedCount,
    housingWaitingCount,
    answersCount,
    housingInProgressWithSupportCount,
    housingInProgressWithoutSupportCount,
    housingExitWithSupportCount,
    housingExitWithoutSupportCount,
    listEstablishmentData,
    housingByStatusCount,
    housingByStatusDuration,
    exportMonitoring
};

export default monitoringController;
