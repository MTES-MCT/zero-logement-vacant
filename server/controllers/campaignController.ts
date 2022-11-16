import { Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignApi, CampaignSteps } from '../models/CampaignApi';
import housingRepository from '../repositories/housingRepository';
import eventRepository from '../repositories/eventRepository';
import { EventApi, EventKinds } from '../models/EventApi';
import { RequestUser } from '../models/UserApi';
import localityRepository from '../repositories/localityRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { Request as JWTRequest } from 'express-jwt';
import { body, param, validationResult } from 'express-validator';
import { constants } from 'http2';

const getCampaignBundleValidators = [
    param('campaignNumber').optional({ nullable: true }).isNumeric(),
    param('reminderNumber').optional({ nullable: true }).isNumeric(),
];

const getCampaignBundle = async (request: JWTRequest, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
    }

    const campaignNumber = request.params.campaignNumber;
    const reminderNumber = request.params.reminderNumber;
    const establishmentId = (<RequestUser>request.auth).establishmentId;
    const query = <string> request.query.q;

    console.log('Get campaign bundle', establishmentId, campaignNumber, reminderNumber)

    return campaignRepository.getCampaignBundle(establishmentId, campaignNumber, reminderNumber, query)
        .then(campaignBundle => campaignBundle ?
            response.status(constants.HTTP_STATUS_OK).json(campaignBundle):
            response.sendStatus(constants.HTTP_STATUS_NOT_FOUND)
        );

}

const listCampaigns = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('List campaigns')

    const establishmentId = (<RequestUser>request.auth).establishmentId;

    return campaignRepository.listCampaigns(establishmentId)
        .then(_ => response.status(constants.HTTP_STATUS_OK).json(_));

}

const listCampaignBundles = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('List campaign bundles')

    const establishmentId = (<RequestUser>request.auth).establishmentId;

    return campaignRepository.listCampaignBundles(establishmentId)
        .then(_ => response.status(constants.HTTP_STATUS_OK).json(_));

}

const createCampaign = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('Create campaign')

    const establishmentId = (<RequestUser>request.auth).establishmentId;
    const userId = (<RequestUser>request.auth).userId;

    const kind = request.body.draftCampaign.kind;
    const filters = request.body.draftCampaign.filters;
    const title = request.body.draftCampaign.title;
    const allHousing = request.body.allHousing;

    const lastNumber = await campaignRepository.lastCampaignNumber(establishmentId)
    const newCampaignApi = await campaignRepository.insert(<CampaignApi>{
        establishmentId,
        campaignNumber: (lastNumber ?? 0) + 1,
        kind,
        reminderNumber: 0,
        filters,
        createdBy: userId,
        validatedAt: new Date(),
        title
    })

    const userLocalities = await localityRepository.listByEstablishmentId(establishmentId).then(_ => _.map(_ => _.geoCode))

    const filterLocalities = (filters.localities ?? []).length ? userLocalities.filter(l => (filters.localities ?? []).indexOf(l) !== -1) : userLocalities

    const housingIds = allHousing ?
        await housingRepository.listWithFilters( {...filters, establishmentIds: [establishmentId], localities: filterLocalities})
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => request.body.housingIds.indexOf(id) === -1)
            ):
        request.body.housingIds;

    await campaignHousingRepository.insertHousingList(newCampaignApi.id, housingIds);

    await removeHousingFromDefaultCampaign(housingIds, establishmentId);

    return response.status(constants.HTTP_STATUS_OK).json(newCampaignApi);

}

const removeHousingFromDefaultCampaign = (housingIds: string[], establishmentId: string) => {
    return campaignRepository.getCampaignBundle(establishmentId, '0').then(defaultCampaign =>
        campaignHousingRepository.deleteHousingFromCampaigns(defaultCampaign ? defaultCampaign.campaignIds : [], housingIds)
    )
}

const createReminderCampaign = async (request: JWTRequest, response: Response): Promise<Response> => {

    const campaignNumber = request.params.campaignNumber;
    const reminderNumber = request.params.reminderNumber;
    const establishmentId = (<RequestUser>request.auth).establishmentId;

    console.log('Create a reminder campaign for', establishmentId, campaignNumber, reminderNumber)

    const userId = (<RequestUser>request.auth).userId;

    const kind = request.body.kind;
    const allHousing = request.body.allHousing;

    const campaignBundle = await campaignRepository.getCampaignBundle(establishmentId, campaignNumber, reminderNumber)

    if (!campaignBundle) {
        return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND);
    }

    const lastReminderNumber = await campaignRepository.lastReminderNumber(establishmentId, campaignBundle.campaignNumber)

    const newCampaignApi = await campaignRepository.insert(<CampaignApi>{
        establishmentId,
        campaignNumber: campaignBundle.campaignNumber,
        kind,
        reminderNumber: lastReminderNumber + 1,
        filters: campaignBundle.filters,
        createdBy: userId,
        validatedAt: new Date()
    })

    const housingIds = allHousing ?
        await housingRepository.listWithFilters( {establishmentIds: [establishmentId], campaignIds: campaignBundle.campaignIds, status: [HousingStatusApi.Waiting]})
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => request.body.housingIds.indexOf(id) === -1)
            ):
        request.body.housingIds;

    await campaignHousingRepository.insertHousingList(newCampaignApi.id, housingIds)

    return response.status(constants.HTTP_STATUS_OK).json(newCampaignApi);

}

const validateStepValidators = [
    param('campaignId').notEmpty().isUUID(),
    body('step').notEmpty().isIn([CampaignSteps.OwnersValidation, CampaignSteps.Export, CampaignSteps.Sending, CampaignSteps.InProgess]),
    body('sendingDate').if(body('step').equals(String(CampaignSteps.Sending))).notEmpty(),
];

const validateStep = async (request: JWTRequest, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
    }

    const campaignId = request.params.campaignId;
    const step = request.body.step;
    const userId = (<RequestUser>request.auth).userId;
    const establishmentId = (<RequestUser>request.auth).establishmentId;

    console.log('Validate campaign step', campaignId, step)

    const campaignApi = await campaignRepository.getCampaign(campaignId)

    if (!campaignApi) {
        return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND)
    }

    else {
        const updatedCampaign = {
            ...campaignApi,
            validatedAt: step === CampaignSteps.OwnersValidation ? new Date() : campaignApi.validatedAt,
            exportedAt: step === CampaignSteps.Export ? new Date() : campaignApi.exportedAt,
            sentAt: step === CampaignSteps.Sending ? new Date() : campaignApi.sentAt,
            sendingDate: step === CampaignSteps.Sending ? request.body.sendingDate : campaignApi.sendingDate
        }

        if (step === CampaignSteps.Sending) {
            const housingList = await housingRepository.listWithFilters({
                establishmentIds: [establishmentId],
                campaignIds: [campaignId]
            }).then(_ => _.entities)

            await housingRepository.updateHousingList(
                housingList
                    .filter(_ => !_.status)
                    .map(_ => _.id),
                HousingStatusApi.Waiting
            )

            await eventRepository.insertList(
                housingList.map(housing => <EventApi>{
                    housingId: housing.id,
                    ownerId: housing.owner.id,
                    campaignId,
                    kind: EventKinds.CampaignSend,
                    content: 'Ajout dans la campagne',
                    createdBy: userId
                })
            )
        }

        return campaignRepository.update(updatedCampaign)
            .then(() => campaignRepository.getCampaign(campaignId))
            .then(_ => response.status(constants.HTTP_STATUS_OK).json(_))
    }
}

const updateCampaignBundle = async (request: JWTRequest, response: Response): Promise<Response> => {

    const campaignNumber = Number(request.params.campaignNumber);
    const reminderNumber = request.params.reminderNumber ? Number(request.params.reminderNumber) : undefined;
    const establishmentId = (<RequestUser>request.auth).establishmentId;

    console.log('Update campaign bundle infos for establishment', establishmentId, campaignNumber, reminderNumber)

    const title = request.body.title;

    const campaigns = await campaignRepository.listCampaigns(establishmentId)
    const campaignsToUpdate = campaigns.filter(_ => _.campaignNumber === campaignNumber && (reminderNumber !== undefined ? _.reminderNumber === reminderNumber : true))

    if (!campaignsToUpdate.length) {
        return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
    } else {

        return Promise.all(
            campaignsToUpdate
                .map(campaign => campaignRepository.update({
                    ...campaign,
                    title
                }))
        )
            .then(() => response.sendStatus(constants.HTTP_STATUS_OK))
    }
}

const deleteCampaignBundleValidators = [
    param('campaignNumber').notEmpty().isNumeric(),
    param('reminderNumber').optional({ nullable: true }).isNumeric(),
];

const deleteCampaignBundle = async (request: JWTRequest, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
    }

    const campaignNumber = Number(request.params.campaignNumber);
    const reminderNumber = request.params.reminderNumber ? Number(request.params.reminderNumber) : undefined;
    const establishmentId = (<RequestUser>request.auth).establishmentId;

    const campaigns = await campaignRepository.listCampaigns(establishmentId)

    const campaignIdsToDelete = campaigns
        .filter(_ => _.campaignNumber === campaignNumber && (reminderNumber !== undefined ? _.reminderNumber === reminderNumber : true))
        .map(_ => _.id)

    if (!campaignIdsToDelete.length) {
        return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
    } else {

        await campaignHousingRepository.deleteHousingFromCampaigns(campaignIdsToDelete)

        await eventRepository.deleteEventsFromCampaigns(campaignIdsToDelete)

        await campaignRepository.deleteCampaigns(campaignIdsToDelete)

        await resetHousingWithoutCampaigns(establishmentId)

        return Promise.all(
            campaigns
                .filter(_ => _.campaignNumber > campaignNumber && reminderNumber === undefined)
                .map(campaign => campaignRepository.update({
                    ...campaign,
                    campaignNumber: campaign.campaignNumber - 1
                }))
        )
            .then(() => response.sendStatus(constants.HTTP_STATUS_OK))
    }

}

const resetHousingWithoutCampaigns = async (establishmentId: string) => {
    return housingRepository.listWithFilters({
        establishmentIds: [establishmentId],
        campaignsCounts: ['0'],
        status: [
            HousingStatusApi.Waiting,
            HousingStatusApi.FirstContact,
            HousingStatusApi.InProgress,
            HousingStatusApi.NotVacant,
            HousingStatusApi.NoAction,
            HousingStatusApi.Exit,
        ]
    }).then(results => Promise.all([
        resetWaitingHousingWithoutCampaigns(establishmentId, results.entities.filter(_ => _.status === HousingStatusApi.Waiting).map(_ => _.id)),
        resetNotWaitingHousingWithoutCampaigns(establishmentId, results.entities.filter(_ => _.status !== HousingStatusApi.Waiting).map(_ => _.id))
    ]))
}

const resetWaitingHousingWithoutCampaigns = async (establishmentId: string, housingIds: string[]) => {
    return housingIds.length ? housingRepository.updateHousingList(housingIds, HousingStatusApi.NeverContacted) : Promise.resolve()
}

const resetNotWaitingHousingWithoutCampaigns = async (establishmentId: string, housingIds: string[]) => {
    return housingIds.length ?  campaignRepository.getCampaignBundle(establishmentId, String(0))
        .then(campaignBundle => {
            if (campaignBundle?.campaignIds[0]) {
                return campaignHousingRepository.insertHousingList(campaignBundle?.campaignIds[0], housingIds)
            }
        }) : Promise.resolve()
}

const removeHousingList = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('Remove campaign housing list')

    const campaignId = request.params.campaignId;
    const campaignHousingStatusApi = <HousingStatusApi>request.body.status;
    const allHousing = <boolean>request.body.allHousing;
    const establishmentId = (<RequestUser>request.auth).establishmentId;

    const housingIds =
        await housingRepository.listWithFilters( {establishmentIds: [establishmentId], campaignIds: [campaignId], status: campaignHousingStatusApi ? [campaignHousingStatusApi] : []})
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => allHousing ? request.body.housingIds.indexOf(id) === -1 : request.body.housingIds.indexOf(id) !== -1)
            );

    return campaignHousingRepository.deleteHousingFromCampaigns([campaignId], housingIds)
        .then(_ => response.status(constants.HTTP_STATUS_OK).json(_));
};

const campaignController =  {
    getCampaignBundleValidators,
    getCampaignBundle,
    listCampaigns,
    listCampaignBundles,
    createCampaign,
    createReminderCampaign,
    updateCampaignBundle,
    validateStepValidators,
    validateStep,
    deleteCampaignBundleValidators,
    deleteCampaignBundle,
    removeHousingList
};

export default campaignController;
