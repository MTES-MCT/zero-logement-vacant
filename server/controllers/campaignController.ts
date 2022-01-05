import { Request, Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignApi, CampaignSteps } from '../models/CampaignApi';
import housingRepository from '../repositories/housingRepository';
import eventRepository from '../repositories/eventRepository';
import { EventApi, EventKinds } from '../models/EventApi';
import { RequestUser } from '../models/UserApi';
import localityRepository from '../repositories/localityRepository';
import { CampaignHousingStatusApi } from '../models/CampaignHousingStatusApi';

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

const create = async (request: Request, response: Response): Promise<Response> => {

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
        await campaignHousingRepository.listCampaignHousing(campaignId, CampaignHousingStatusApi.Waiting)
            .then(results => eventRepository.insertList(
                results.entities.map(campaignHousing => <EventApi>{
                    housingId: campaignHousing.id,
                    ownerId: campaignHousing.owner.id,
                    kind: EventKinds.CampaignSend,
                    content: 'Campagne envoyée',
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
    deleteCampaign
    // importFromAirtable
};

export default campaignController;
