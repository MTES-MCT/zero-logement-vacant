import { Request, Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignApi } from '../models/CampaignApi';

const list = async (request: Request, response: Response): Promise<Response> => {

    console.log('List campaigns')

    return campaignRepository.list()
        .then(_ => response.status(200).json(_));

}

const create = async (request: Request, response: Response): Promise<Response> => {

    console.log('Create campaign')

    const name = request.body.name;
    const housingRefs = request.body.housingIds;

    return campaignRepository.insert(<CampaignApi>{name})
        .then(campaign => campaignHousingRepository.insertHousingList(campaign.id!, housingRefs))
        .then(_ => response.status(200).json(_));

}

const test = () => {
    return 2;
}

const campaignController =  {
    list,
    create,
    test
};

export default campaignController;
