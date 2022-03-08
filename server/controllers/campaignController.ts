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

const get = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;

    console.log('Get campaign', campaignId)

    return campaignRepository.get(campaignId)
        .then(_ => response.status(200).json(_));

}

const list = async (request: Request, response: Response): Promise<Response> => {

    console.log('List campaigns')

    const establishmentId = (<RequestUser>request.user).establishmentId;

    return campaignRepository.list(establishmentId)
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
        await housingRepository.listWithFilters({...filters, localities: filterLocalities})
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => request.body.housingIds.indexOf(id) === -1)
            ):
        request.body.housingIds;

    await campaignHousingRepository.insertHousingList(newCampaignApi.id, housingIds)

    return response.status(200).json(newCampaignApi.id);

}

const createReminderCampaign = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;

    console.log('Create a reminder campaign for', campaignId)

    const establishmentId = (<RequestUser>request.user).establishmentId;
    const userId = (<RequestUser>request.user).userId;

    const startMonth = request.body.startMonth;
    const allHousing = request.body.allHousing;

    const campaign = await campaignRepository.get(campaignId)
    const lastReminderNumber = await campaignRepository.lastReminderNumber(establishmentId, campaign.campaignNumber)

    const newCampaignApi = await campaignRepository.insert(<CampaignApi>{
        establishmentId,
        campaignNumber: campaign.campaignNumber,
        startMonth,
        kind: CampaignKinds.Remind,
        reminderNumber: lastReminderNumber + 1,
        filters: campaign.filters,
        createdBy: userId,
        validatedAt: new Date()
    })

    const housingIds = allHousing ?
        await housingRepository.listWithFilters({campaignIds: [campaignId]})
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => request.body.housingIds.indexOf(id) === -1)
            ):
        request.body.housingIds;

    await campaignHousingRepository.insertHousingList(newCampaignApi.id, housingIds)

    return response.status(200).json(newCampaignApi.id);

}

const validateStep = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;
    const step = request.body.step;
    const userId = (<RequestUser>request.user).userId;

    console.log('Validate campaign step', campaignId, step)

    const updatedCampaign = await campaignRepository.get(campaignId).then((campaignApi: CampaignApi) => ({
        ...campaignApi,
        validatedAt: step === CampaignSteps.OwnersValidation ? new Date() : campaignApi.validatedAt,
        exportedAt: step === CampaignSteps.Export ? new Date() : campaignApi.exportedAt,
        sentAt: step === CampaignSteps.Sending ? new Date() : campaignApi.sentAt,
        sendingDate: step === CampaignSteps.Sending ? request.body.sendingDate : campaignApi.sendingDate
    }))

    if (step === CampaignSteps.Sending) {
        await housingRepository.listWithFilters({campaignIds: [campaignId], status: [HousingStatusApi.Waiting]})
            .then(results => eventRepository.insertList(
                results.entities.map(campaignHousing => <EventApi>{
                    housingId: campaignHousing.id,
                    ownerId: campaignHousing.owner.id,
                    campaignId,
                    kind: EventKinds.CampaignSend,
                    content: 'Ajout dans la campagne',
                    createdBy: userId
                })
            ))
    }

    return campaignRepository.update(updatedCampaign)
        .then(() => campaignRepository.get(campaignId))
        .then(_ => response.status(200).json(_))
}


const deleteCampaign = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;
    const establishmentId = (<RequestUser>request.user).establishmentId;

    const campaigns = await campaignRepository.list(establishmentId)
    const campaignToDelete = campaigns.find(_ => _.id === campaignId)

    if (!campaignToDelete) {
        return response.sendStatus(401)
    } else {

        await campaignHousingRepository.deleteHousingFromCampaign(campaignId)

        await eventRepository.deleteEventsFromCampaign(campaignId)

        await campaignRepository.deleteCampaign(campaignId)

        return Promise.all(
            campaigns
                .filter(_ => _.campaignNumber > campaignToDelete.campaignNumber)
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

    const housingIds =
        await housingRepository.listWithFilters({campaignIds: [campaignId], status: [campaignHousingStatusApi]})
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => allHousing ? request.body.housingIds.indexOf(id) === -1 : request.body.housingIds.indexOf(id) !== -1)
            );

    return campaignHousingRepository.deleteHousingFromCampaign(campaignId, housingIds)
        .then(_ => response.status(200).json(_));
};

const campaignController =  {
    get,
    list,
    createCampaign,
    createReminderCampaign,
    validateStep,
    deleteCampaign,
    removeHousingList
};

export default campaignController;
