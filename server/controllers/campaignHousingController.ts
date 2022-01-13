import { Request, Response } from 'express';
import { CampaignHousingApi, CampaignHousingUpdateApi } from '../models/HousingApi';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignHousingStatusApi } from '../models/CampaignHousingStatusApi';
import eventRepository from '../repositories/eventRepository';
import { EventApi, EventKinds } from '../models/EventApi';
import { RequestUser } from '../models/UserApi';

const listCampaignHousing = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;

    const page = request.body.page;
    const perPage = request.body.perPage;
    const status = request.body.status;

    console.log('List campaign housing', campaignId, page, perPage, status)

    return campaignHousingRepository.listCampaignHousing(campaignId, status, page, perPage)
        .then(_ => response.status(200).json(_));
}

const listCampaignHousingByOwner = async (request: Request, response: Response): Promise<Response> => {

    const ownerId = request.params.ownerId;

    console.log('List campaign housing by owner', ownerId)

    return campaignHousingRepository.listCampaignHousingByOwner(ownerId)
        .then(_ => response.status(200).json(_));
}

const updateCampaignHousingList = async (request: Request, response: Response): Promise<Response> => {

    console.log('Update campaign housing list')

    const userId = (<RequestUser>request.user).userId;
    const campaignId = <string>request.body.campaignId;
    const campaignHousingUpdateApi = <CampaignHousingUpdateApi>request.body.campaignHousingUpdate;
    const allHousing = <boolean>request.body.allHousing;

    const housingIds = allHousing ?
        await campaignHousingRepository.listCampaignHousing(campaignId, campaignHousingUpdateApi.previousStatus)
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => request.body.housingIds.indexOf(id) === -1)
            ): request.body.housingIds;

    const prevCampaignHousingWithOwners = await campaignHousingRepository.listCampaignHousing(campaignId, campaignHousingUpdateApi.previousStatus)
        .then(_ => _.entities.filter( campaignHousing => housingIds.indexOf(campaignHousing.id) !== -1))

    const updatedCampaignHousing = await campaignHousingRepository.updateList(campaignId, campaignHousingUpdateApi, housingIds)

    await eventRepository.insertList(prevCampaignHousingWithOwners.map(campaignHousing => (<EventApi>{
        housingId: campaignHousing.id,
        ownerId: campaignHousing.owner.id,
        kind: EventKinds.StatusChange,
        campaignId,
        contactKind: campaignHousingUpdateApi.contactKind,
        content: [
            getStatusLabel(campaignHousing, campaignHousingUpdateApi),
            campaignHousingUpdateApi.comment
        ]
            .filter(_ => _ !== null && _ !== undefined)
            .join('. '),
        createdBy: userId
    })))

    return response.status(200).json(updatedCampaignHousing);
};

const getStatusLabel = (campaignHousing: CampaignHousingApi, campaignHousingUpdateApi: CampaignHousingUpdateApi) => {

    return (campaignHousing.status !== campaignHousingUpdateApi.status ||
        campaignHousing.step != campaignHousingUpdateApi.step ||
        campaignHousing.precision != campaignHousingUpdateApi.precision) ?
        [
            'Passage à ' + [
                'En attente de retour',
                'Suivi en cours',
                'Non-vacant',
                'Sans suite',
                'Sortie de la vacance'
            ][campaignHousingUpdateApi.status],
            campaignHousingUpdateApi.step,
            campaignHousingUpdateApi.precision
        ].filter(_ => _ !== null && _ !== undefined).join(' - ') : undefined
}

const removeCampaignHousingList = async (request: Request, response: Response): Promise<Response> => {

    console.log('Remove campaign housing list')

    const campaignId = <string>request.body.campaignId;
    const campaignHousingStatusApi = <CampaignHousingStatusApi>request.body.status;
    const allHousing = <boolean>request.body.allHousing;

    const housingIds = allHousing ?
        await campaignHousingRepository.listCampaignHousing(campaignId, campaignHousingStatusApi)
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => request.body.housingIds.indexOf(id) === -1)
            ): request.body.housingIds;

    return campaignHousingRepository.deleteHousingFromCampaign(campaignId, housingIds)
        .then(_ => response.status(200).json(_));
};

const campaignHousingController =  {
    listCampaignHousing,
    listCampaignHousingByOwner,
    updateCampaignHousingList,
    removeCampaignHousingList
};

export default campaignHousingController;
