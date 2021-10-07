import { Request, Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import { CampaignApi } from '../models/CampaignApi';

const list = async (request: Request, response: Response): Promise<Response> => {

    console.log('List campaigns')

    return campaignRepository.list()
        .then(_ => response.status(200).json(_));

}

const create = async (request: Request, response: Response): Promise<Response> => {

    console.log('Create campaign')

    const campaign = <CampaignApi>{name: 'test3'}

    return campaignRepository.insert(campaign)
        .then(_ => response.status(200).json(_));

}

const campaignController =  {
    list,
    create
};

export default campaignController;
