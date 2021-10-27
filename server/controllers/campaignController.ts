import { Request, Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignApi, CampaignSteps } from '../models/CampaignApi';
import config from '../utils/config';

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
        .then(campaignApi => campaignApi.id ? campaignHousingRepository.insertHousingList(campaignApi.id, housingRefs) : Promise.resolve([]))
        .then((housingRefs: string[]) => response.status(200).json({count: housingRefs.length}));

}

const validateStep = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;
    const step = request.body.step;

    console.log('Validate campaign step', campaignId, step)

    return campaignRepository.get(campaignId)
        .then((campaignApi: CampaignApi) => campaignRepository.update(
            {
                ...campaignApi,
                validatedAt: step === CampaignSteps.OwnersValidation ? new Date() : campaignApi.validatedAt,
                sentAt: step === CampaignSteps.SendingConfirmation ? new Date() : campaignApi.sentAt
            }
        ))
        .then(campaignApi => response.status(200).json(campaignApi));

}

const importFromAirtable = async (request: Request, response: Response): Promise<Response> => {

    console.log('Import campaign from Airtable')

    const Airtable = require('airtable');
    const base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    return base('🏡 Adresses').select({
        fields: [
            '✉️ Campagnes (ID - Mois/Année - Moyen)',
            'Record-ID=adresse'
        ],
        filterByFormula: '{✉️ Campagnes (ID - Mois/Année - Moyen)} != ""'
    })
        .all()
        .then((_: any) => {
            return _
                .map((result: any) => ({
                    name: result.fields['✉️ Campagnes (ID - Mois/Année - Moyen)'],
                    housingRef: result.fields['Record-ID=adresse']
                }))
                .reduce((map: Map<string, string[]>, obj: { name: string, housingRef: string }) => {
                    map.set(obj.name, [...map.get(obj.name) ?? [], obj.housingRef]);
                    return map;
                }, new Map())
        })
        .then((campaignMap: Map<string, string[]>) => {
            campaignMap.forEach((housingRefs: string[], name: string) => {
                campaignRepository.insert(<CampaignApi>{name})
                    .then(campaign => campaign.id ? campaignHousingRepository.insertHousingList(campaign.id, housingRefs) : Promise.resolve([]))
            })
        })
        .then((_: any) => {
            return response.status(200).json(_)
        })
        .catch((_: any) => console.error(_));

}

const campaignController =  {
    list,
    create,
    validateStep,
    importFromAirtable
};

export default campaignController;
