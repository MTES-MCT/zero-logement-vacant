import { Request, Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignApi, CampaignKinds, CampaignSteps } from '../models/CampaignApi';
import housingRepository from '../repositories/housingRepository';
import eventRepository from '../repositories/eventRepository';
import { EventApi, EventKinds } from '../models/EventApi';
import { RequestUser } from '../models/UserApi';
import localityRepository from '../repositories/localityRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';

const getCampaign = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;

    console.log('Get campaign', campaignId)

    const establishmentId = (<RequestUser>request.user).establishmentId;

    return campaignRepository.getCampaign(campaignId)
        .then(campaign => campaign.establishmentId === establishmentId ?
            response.status(200).json(campaign) :
            response.sendStatus(401));
}

const getCampaignBundle = async (request: Request, response: Response): Promise<Response> => {

    const campaignNumber = request.params.campaignNumber;
    const reminderNumber = request.params.reminderNumber;
    const establishmentId = (<RequestUser>request.user).establishmentId;

    console.log('Get campaign bundle', establishmentId, campaignNumber, reminderNumber)

    return campaignRepository.getCampaignBundle(establishmentId, campaignNumber, reminderNumber)
        .then(_ => response.status(200).json(_));

}

const listCampaigns = async (request: Request, response: Response): Promise<Response> => {

    console.log('List campaigns')

    const establishmentId = (<RequestUser>request.user).establishmentId;

    return campaignRepository.listCampaigns(establishmentId)
        .then(_ => response.status(200).json(_));

}

const listCampaignBundles = async (request: Request, response: Response): Promise<Response> => {

    console.log('List campaign bundles')

    const establishmentId = (<RequestUser>request.user).establishmentId;

    return campaignRepository.listCampaignBundles(establishmentId)
        .then(_ => response.status(200).json(_));

}

const createCampaign = async (request: Request, response: Response): Promise<Response> => {

    console.log('Create campaign')

    const establishmentId = (<RequestUser>request.user).establishmentId;
    const userId = (<RequestUser>request.user).userId;

    const startMonth = request.body.draftCampaign.startMonth;
    const kind = request.body.draftCampaign.kind;
    const filters = request.body.draftCampaign.filters;
    const allHousing = request.body.allHousing;

    const lastNumber = await campaignRepository.lastCampaignNumber(establishmentId)
    const newCampaignApi = await campaignRepository.insert(<CampaignApi>{
        establishmentId,
        campaignNumber: (lastNumber ?? 0) + 1,
        startMonth,
        kind,
        reminderNumber: 0,
        filters,
        createdBy: userId,
        validatedAt: new Date()
    })

    const userLocalities = await localityRepository.listByEstablishmentId(establishmentId).then(_ => _.map(_ => _.geoCode))

    const filterLocalities = (filters.localities ?? []).length ? userLocalities.filter(l => (filters.localities ?? []).indexOf(l) !== -1) : userLocalities

    const housingIds = allHousing ?
        await housingRepository.listWithFilters(establishmentId, {...filters, localities: filterLocalities})
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => request.body.housingIds.indexOf(id) === -1)
            ):
        request.body.housingIds;

    await campaignHousingRepository.insertHousingList(newCampaignApi.id, housingIds)

    return response.status(200).json(newCampaignApi);

}

const createReminderCampaign = async (request: Request, response: Response): Promise<Response> => {

    const campaignNumber = request.params.campaignNumber;
    const reminderNumber = request.params.reminderNumber;
    const establishmentId = (<RequestUser>request.user).establishmentId;

    console.log('Create a reminder campaign for', establishmentId, campaignNumber, reminderNumber)

    const userId = (<RequestUser>request.user).userId;

    const startMonth = request.body.startMonth;
    const allHousing = request.body.allHousing;

    const campaignBundle = await campaignRepository.getCampaignBundle(establishmentId, campaignNumber, reminderNumber)
    const lastReminderNumber = await campaignRepository.lastReminderNumber(establishmentId, campaignBundle.campaignNumber)

    const newCampaignApi = await campaignRepository.insert(<CampaignApi>{
        establishmentId,
        campaignNumber: campaignBundle.campaignNumber,
        startMonth,
        kind: CampaignKinds.Remind,
        reminderNumber: lastReminderNumber + 1,
        filters: campaignBundle.filters,
        createdBy: userId,
        validatedAt: new Date()
    })

    const housingIds = allHousing ?
        await housingRepository.listWithFilters(establishmentId, {campaignIds: campaignBundle.campaignIds, status: [HousingStatusApi.Waiting]})
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => request.body.housingIds.indexOf(id) === -1)
            ):
        request.body.housingIds;

    await campaignHousingRepository.insertHousingList(newCampaignApi.id, housingIds)

    return response.status(200).json(newCampaignApi);

}

const validateStep = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;
    const step = request.body.step;
    const userId = (<RequestUser>request.user).userId;
    const establishmentId = (<RequestUser>request.user).establishmentId;

    console.log('Validate campaign step', campaignId, step)

    const updatedCampaign = await campaignRepository.getCampaign(campaignId).then((campaignApi: CampaignApi) => ({
        ...campaignApi,
        validatedAt: step === CampaignSteps.OwnersValidation ? new Date() : campaignApi.validatedAt,
        exportedAt: step === CampaignSteps.Export ? new Date() : campaignApi.exportedAt,
        sentAt: step === CampaignSteps.Sending ? new Date() : campaignApi.sentAt,
        sendingDate: step === CampaignSteps.Sending ? request.body.sendingDate : campaignApi.sendingDate
    }))

    console.log('Validate campaign step getCampaign', campaignId, step)

    if (step === CampaignSteps.Sending) {

        const housingList = await housingRepository.listWithFilters(establishmentId, {campaignIds: [campaignId]}).then(_ => _.entities)

        console.log('Validate campaign step housingList', campaignId, step)

        await housingRepository.updateHousingList(housingList.map(_ => _.id), HousingStatusApi.Waiting)

        console.log('Validate campaign step updateHousingList', campaignId, step)

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
        console.log('Validate campaign step insertList', campaignId, step)
    }

    return campaignRepository.update(updatedCampaign)
        .then(() => {
            console.log('Validate campaign step update', campaignId, step)
            return campaignRepository.getCampaign(campaignId)
        })
        .then(_ => response.status(200).json(_))
}


const deleteCampaign = async (request: Request, response: Response): Promise<Response> => {

    const campaignNumber = Number(request.params.campaignNumber);
    const establishmentId = (<RequestUser>request.user).establishmentId;

    const campaigns = await campaignRepository.listCampaigns(establishmentId)
    const campaignsToDelete = campaigns.filter(_ => _.campaignNumber === campaignNumber)

    if (!campaignsToDelete.length) {
        return response.sendStatus(401)
    } else {

        await campaignHousingRepository.deleteHousingFromCampaigns(campaignsToDelete.map(_ => _.id))

        await eventRepository.deleteEventsFromCampaigns(campaignsToDelete.map(_ => _.id))

        await campaignRepository.deleteCampaignBundle(establishmentId, campaignNumber)

        return Promise.all(
            campaigns
                .filter(_ => _.campaignNumber > campaignNumber)
                .map(campaign => campaignRepository.update({
                    ...campaign,
                    campaignNumber: campaign.campaignNumber - 1
                }))
        )
            .then(() => response.send(200))
    }

}


const removeHousingList = async (request: Request, response: Response): Promise<Response> => {

    console.log('Remove campaign housing list')

    const campaignId = request.params.campaignId;
    const campaignHousingStatusApi = <HousingStatusApi>request.body.status;
    const allHousing = <boolean>request.body.allHousing;
    const establishmentId = (<RequestUser>request.user).establishmentId;

    const housingIds =
        await housingRepository.listWithFilters(establishmentId, {campaignIds: [campaignId], status: [campaignHousingStatusApi]})
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => allHousing ? request.body.housingIds.indexOf(id) === -1 : request.body.housingIds.indexOf(id) !== -1)
            );

    return campaignHousingRepository.deleteHousingFromCampaigns([campaignId], housingIds)
        .then(_ => response.status(200).json(_));
};

const campaignController =  {
    getCampaign,
    getCampaignBundle,
    listCampaigns,
    listCampaignBundles,
    createCampaign,
    createReminderCampaign,
    validateStep,
    deleteCampaign,
    removeHousingList
};

export default campaignController;
