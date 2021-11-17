import { Request, Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignApi, CampaignSteps } from '../models/CampaignApi';

const list = async (request: Request, response: Response): Promise<Response> => {

    console.log('List campaigns')

    return campaignRepository.list()
        .then(_ => response.status(200).json(_));

}

const create = async (request: Request, response: Response): Promise<Response> => {

    console.log('Create campaign')

    const startMonth = request.body.draftCampaign.startMonth;
    const kind = request.body.draftCampaign.kind;
    const filters = request.body.draftCampaign.filters;
    const housingRefs = request.body.housingIds;

    const lastNumber = await campaignRepository.lastCampaignNumber()
    const newCampaignApi = await campaignRepository.insert(<CampaignApi>{campaignNumber: (lastNumber ?? 0) + 1, startMonth, kind, filters})

    await campaignHousingRepository.insertHousingList(newCampaignApi.id, housingRefs)

    return response.status(200).json(newCampaignApi);

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
                exportedAt: step === CampaignSteps.Export ? new Date() : campaignApi.exportedAt,
                sentAt: step === CampaignSteps.Sending ? new Date() : campaignApi.sentAt
            }
        ))
        .then(campaignApi => response.status(200).json(campaignApi));

}

// const importFromAirtable = async (request: Request, response: Response): Promise<Response> => {
//
//     console.log('Import campaign from Airtable')
//
//     const Airtable = require('airtable');
//     const base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);
//
//     return base('🏡 Adresses').select({
//         fields: [
//             '✉️ Campagnes (ID - Mois/Année - Moyen)',
//             'Record-ID=adresse',
//             'Date prise de contact'
//         ],
//         filterByFormula: '{✉️ Campagnes (ID - Mois/Année - Moyen)} != ""'
//     })
//         .all()
//         .then((_: any) => {
//             return _
//                 .map((result: any) => ({
//                     name: result.fields['✉️ Campagnes (ID - Mois/Année - Moyen)'],
//                     housingRef: result.fields['Record-ID=adresse'],
//                     contactAt: result.fields['Date prise de contact']
//                 }))
//                 .reduce((map: Map<string, {contactAt: string, housingRefs: string[]}>, obj: { name: string, housingRef: string, contactAt: string }) => {
//                     map.set(obj.name, {
//                         contactAt: map.get(obj.name)?.contactAt ?? obj.contactAt,
//                         housingRefs: [...map.get(obj.name)?.housingRefs ?? [], obj.housingRef]
//                     })
//                     return map;
//                 }, new Map())
//         })
//         .then((campaignMap: Map<string, {contactAt: string, housingRefs: string[]}>) => {
//             campaignMap.forEach(({contactAt, housingRefs}, name) => {
//                 campaignRepository.insert(<CampaignApi>{
//                     name,
//                     createdAt: contactAt ? parse(contactAt, 'yyyy-MM-dd', new Date()) : new Date(),
//                     validatedAt: contactAt ? parse(contactAt, 'yyyy-MM-dd', new Date()) : new Date(),
//                     sentAt: contactAt ? parse(contactAt, 'yyyy-MM-dd', new Date()) : new Date(),
//                 })
//                     .then(campaign => campaign.id ? campaignHousingRepository.insertHousingList(campaign.id, housingRefs) : Promise.resolve([]))
//             })
//         })
//         .then((_: any) => {
//             return response.status(200).json(_)
//         })
//         .catch((_: any) => console.error(_));
//
// }

const campaignController =  {
    list,
    create,
    validateStep,
    // importFromAirtable
};

export default campaignController;
