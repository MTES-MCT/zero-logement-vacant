import { Request, Response } from 'express';
import { CampaignHousingUpdateApi } from '../models/HousingApi';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignHousingStatusApi } from '../models/CampaignHousingStatusApi';

const listCampaignHousing = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;

    const page = request.body.page;
    const perPage = request.body.perPage;
    const status = request.body.status;

    console.log('List campaign housing', campaignId, page, perPage, status)

    return campaignHousingRepository.listCampaignHousing(campaignId, status, page, perPage)
        .then(_ => response.status(200).json(_));
}

const updateCampaignHousingList = async (request: Request, response: Response): Promise<Response> => {

    console.log('Update campaign housing list')

    const campaignId = <string>request.body.campaignId;
    const campaignHousingUpdateApi = <CampaignHousingUpdateApi>request.body.campaignHousingUpdate;
    const allHousing = <boolean>request.body.allHousing;

    const housingIds = allHousing ?
        await campaignHousingRepository.listCampaignHousing(campaignId, campaignHousingUpdateApi.prevStatus)
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => request.body.housingIds.indexOf(id) === -1)
            ): request.body.housingIds;

    return campaignHousingRepository.updateList(campaignId, campaignHousingUpdateApi, housingIds)
        .then(_ => response.status(200).json(_));
};

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

    return campaignHousingRepository.removeHousingFromCampaign(campaignId, housingIds)
        .then(_ => response.status(200).json(_));
};

const campaignHousingController =  {
    listCampaignHousing,
    updateCampaignHousingList,
    removeCampaignHousingList
};

export default campaignHousingController;
