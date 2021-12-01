import { Request, Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignApi, CampaignSteps } from '../models/CampaignApi';
import housingRepository from '../repositories/housingRepository';
import eventRepository from '../repositories/eventRepository';
import { EventApi, EventKinds } from '../models/EventApi';

const get = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;

    console.log('Get campaign', campaignId)

    return campaignRepository.get(campaignId)
        .then(_ => response.status(200).json(_));

}

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
    const allHousing = request.body.allHousing;

    const lastNumber = await campaignRepository.lastCampaignNumber()
    const newCampaignApi = await campaignRepository.insert(<CampaignApi>{campaignNumber: (lastNumber ?? 0) + 1, startMonth, kind, filters})

    const housingIds = allHousing ?
        await housingRepository.list(filters)
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
    const excludeHousingIds = request.body.excludeHousingIds;

    console.log('Validate campaign step', campaignId, step)

    const updatedCampaign = await campaignRepository.get(campaignId).then((campaignApi: CampaignApi) => ({
        ...campaignApi,
        validatedAt: step === CampaignSteps.OwnersValidation ? new Date() : campaignApi.validatedAt,
        exportedAt: step === CampaignSteps.Export ? new Date() : campaignApi.exportedAt,
        sentAt: step === CampaignSteps.Sending ? new Date() : campaignApi.sentAt,
        sendingDate: step === CampaignSteps.Sending ? request.body.sendingDate : campaignApi.sendingDate
    }))

    if (step === CampaignSteps.OwnersValidation && excludeHousingIds) {
        console.log('remove ', campaignId, excludeHousingIds)
        await campaignHousingRepository.removeHousingFromCampaign(campaignId, excludeHousingIds)
    }

    if (step === CampaignSteps.Sending) {
        await campaignHousingRepository.getHousingOwnerIds(campaignId)
            .then(results => eventRepository.addByCampaign(
                campaignId,
                results.map(ids => <EventApi>{
                    housingId: ids.housingId,
                    ownerId: ids.ownerId,
                    kind: EventKinds.CampaignSend,
                    content:'Campagne envoyée'
                })
            ))
    }

    return campaignRepository.update(updatedCampaign)
        .then(() => campaignRepository.get(campaignId))
        .then(_ => response.status(200).json(_))
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
    get,
    list,
    create,
    validateStep,
    // importFromAirtable
};

export default campaignController;
