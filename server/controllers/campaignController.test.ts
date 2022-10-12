import { campaignsHousingTable } from '../repositories/campaignHousingRepository';
import db from '../repositories/db';
import { campaignsTable } from '../repositories/campaignRepository';
import protectedRouter from '../routers/protected';
import express from 'express';
import request from 'supertest';
import { withAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import bodyParser from 'body-parser';
import { Housing0, Housing1, Housing2 } from '../../database/seeds/test/005-housing';
import { Campaign1 } from '../../database/seeds/test/006-campaigns';
import { eventsTable } from '../repositories/eventRepository';
import { CampaignSteps } from '../models/CampaignApi';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { formatISO } from 'date-fns';
import { housingTable } from '../repositories/housingRepository';
import randomstring from 'randomstring';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(protectedRouter);

describe('Campaign controller', () => {

    describe('getCampaignBundle', () => {

        const testRoute = (campaignNumber?: any, reminderNumber?: any) =>
            `/api/campaigns/bundles/number${campaignNumber ? '/' + campaignNumber + (reminderNumber !== undefined ? '/' + reminderNumber : '') : ''}`

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).get(testRoute(Campaign1.campaignNumber, Campaign1.reminderNumber)).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should received a valid campaign number', async () => {

            await withAccessToken(
                request(app).get(testRoute('number'))
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

            await withAccessToken(
                request(app).get(testRoute(Campaign1.campaignNumber, 'number'))
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

        });

        it('should return an error when there is no campaign bundle with the required ids', async () => {

            await withAccessToken(
                request(app).get(testRoute(999))
            ).expect(constants.HTTP_STATUS_NOT_FOUND)

        });

        it('should return the campaign bundle for the required ids', async () => {

           const res = await withAccessToken(
               request(app).get(testRoute(Campaign1.campaignNumber, Campaign1.reminderNumber))
           ).expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.objectContaining({
                    campaignIds: [Campaign1.id],
                    campaignNumber: Campaign1.campaignNumber,
                    reminderNumber: String(Campaign1.reminderNumber),
                    startMonth: Campaign1.startMonth,
                    filters: expect.objectContaining(Campaign1.filters)
                })
            )
        })

        it('should return the global campaign bundle', async () => {

           const res = await withAccessToken(
               request(app).get(testRoute())
           ).expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.objectContaining({
                    campaignIds: expect.arrayContaining([Campaign1.id]),
                    housingCount: '2'
                })
            )
        })
    })


    describe('listCampaigns', () => {

        const testRoute = '/api/campaigns'

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).get(testRoute).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should list campaigns', async () => {

            const res = await withAccessToken(
                request(app).get(testRoute)
            ).expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.arrayContaining(
                    [
                        expect.objectContaining({
                            campaignNumber: Campaign1.campaignNumber,
                            startMonth: Campaign1.startMonth,
                            reminderNumber: Campaign1.reminderNumber,
                        })
                    ]
                )
            )
        })
    })


    describe('listCampaignBundles', () => {

        const testRoute = '/api/campaigns/bundles'

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).get(testRoute).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should list campaign bundles', async () => {

            const res = await withAccessToken(
                request(app).get(testRoute)
            ).expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.arrayContaining(
                    [
                        expect.objectContaining({
                            campaignIds: [Campaign1.id],
                            startMonth: Campaign1.startMonth,
                            campaignNumber: Campaign1.campaignNumber,
                        })
                    ]
                )
            )
        })
    })

    describe('createCampaign', () => {

        const testRoute = '/api/campaigns/creation'

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).post(testRoute).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should create a new campaign', async () => {

            const res = await withAccessToken(request(app).post(testRoute))
                .send({
                    draftCampaign: {
                        startMonth: '2112',
                        reminderNumber: 0,
                        filters: {}
                    },
                    housingIds: [Housing1.id, Housing2.id]
                })
                .expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.objectContaining({
                    startMonth: '2112',
                    reminderNumber: 0
                })
            )

            await db(campaignsTable)
                .where('establishment_id', Establishment1.id)
                .andWhere('campaign_number', '2')
                .then(result => {
                    expect(result[0]).toEqual(expect.objectContaining({
                            campaign_number: 2,
                            start_month: '2112',
                            reminder_number: 0,
                        }
                    ))
                });

            await db(campaignsHousingTable)
                .join(campaignsTable, 'campaign_id', 'id')
                .where('establishment_id', Establishment1.id)
                .andWhere('campaign_number', 2)
                .then(result => {
                    expect(result).toEqual(expect.arrayContaining([
                        expect.objectContaining( { housing_id: Housing1.id }),
                        expect.objectContaining( { housing_id: Housing2.id })
                    ]))
                });
        })

        it('should remove housing from default campaign', async () => {
            await withAccessToken(request(app).post(testRoute))
                .send({
                    draftCampaign: {
                        startMonth: '2112',
                        reminderNumber: 0,
                        filters: {}
                    },
                    housingIds: [Housing0.id]
                })
                .expect(constants.HTTP_STATUS_OK);

            await db(campaignsHousingTable)
                .join(campaignsTable, 'campaign_id', 'id')
                .where('establishment_id', Establishment1.id)
                .andWhere('campaign_number', 0)
                .then(result => {
                    expect(result).toEqual(expect.not.arrayContaining([
                        expect.objectContaining({ housing_id: Housing0.id })
                    ]))
                });
        })
    })

    describe('validateStep', () => {

        const testRoute = (campaignId: string) => `/api/campaigns/${campaignId}`

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).put(testRoute(Campaign1.id)).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should received a valid campaign id', async () => {

            await withAccessToken(
                request(app).put(testRoute(randomstring.generate()))
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

            await withAccessToken(
                request(app).put(testRoute(uuidv4()))
                    .send({step: CampaignSteps.OwnersValidation})
            ).expect(constants.HTTP_STATUS_NOT_FOUND)

        });

        it('should received a valid step', async () => {

            await withAccessToken(
                request(app).put(testRoute(Campaign1.id))
                    .send({})
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

            await withAccessToken(
                request(app).put(testRoute(Campaign1.id))
                    .send({step: 15})
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

        });

        it('should received a valid sending date on sending step', async () => {

            await withAccessToken(
                request(app).put(testRoute(Campaign1.id))
                    .send({ step: CampaignSteps.Sending })
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

        });

        it('should update the campaign when validating step OwnersValidation', async () => {

            const res =
                await withAccessToken(
                    request(app).put(testRoute(Campaign1.id))
                        .send({ step: CampaignSteps.OwnersValidation })
                ).expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.objectContaining({
                    id: Campaign1.id,
                    validatedAt: expect.anything(),
                    exportedAt: null,
                    sentAt: null
                })
            )

            await db(campaignsTable)
                .where('id', Campaign1.id)
                .first()
                .then(result => expect(result).toMatchObject(
                    expect.objectContaining({
                        id: Campaign1.id,
                        validated_at: expect.anything(),
                        exported_at: null,
                        sent_at: null
                    })
                ));

        })

        it('should update the campaign when validating step Export', async () => {

            const res =
                await withAccessToken(
                    request(app).put(testRoute(Campaign1.id))
                        .send({ step: CampaignSteps.Export })
                ).expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.objectContaining({
                    id: Campaign1.id,
                    exportedAt: expect.anything(),
                    sentAt: null
                })
            )

            await db(campaignsTable)
                .where('id', Campaign1.id)
                .first()
                .then(result => expect(result).toMatchObject(
                    expect.objectContaining({
                        id: Campaign1.id,
                        exported_at: expect.anything(),
                        sent_at: null
                    })
                ));

        })

        it('should update the campaign when validating step Sending and update housing status if needed', async () => {

            await db(campaignsHousingTable).insert([
                { campaign_id: Campaign1.id, housing_id: Housing0.id },
                { campaign_id: Campaign1.id, housing_id: Housing2.id }
            ])
            await db(housingTable).update({status: HousingStatusApi.NeverContacted}).where('id', Housing1.id)
            await db(housingTable).update({status: HousingStatusApi.InProgress}).where('id', Housing2.id)

            console.log('format ISO', formatISO(new Date()))

            const res =
                await withAccessToken(
                    request(app).put(testRoute(Campaign1.id))
                        .send({ step: CampaignSteps.Sending, sendingDate: formatISO(new Date()) })
                ).expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.objectContaining({
                    id: Campaign1.id,
                    sentAt: expect.anything(),
                    sendingDate: expect.anything()
                })
            )

            await db(campaignsTable)
                .where('id', Campaign1.id)
                .first()
                .then(result => expect(result).toMatchObject(
                    expect.objectContaining({
                        id: Campaign1.id,
                        sent_at: expect.anything(),
                        sending_date: expect.anything()
                    })
                ));

            await db(housingTable)
                .where('id', Housing0.id)
                .first()
                .then(result => expect(result.status).toBe(HousingStatusApi.Waiting));

            await db(housingTable)
                .where('id', Housing1.id)
                .first()
                .then(result => expect(result.status).toBe(HousingStatusApi.Waiting));

            await db(housingTable)
                .where('id', Housing2.id)
                .first()
                .then(result => expect(result.status).toBe(HousingStatusApi.InProgress));

        })

    })

    describe('deleteCampaignBundle', () => {

        const testRoute = (campaignNumber?: any, reminderNumber?: any) =>
            `/api/campaigns/bundles/number${campaignNumber ? '/' + campaignNumber + (reminderNumber !== undefined ? '/' + reminderNumber : '') : ''}`

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).delete(testRoute(Campaign1.campaignNumber, Campaign1.reminderNumber)).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should received a valid campaign number', async () => {

            await withAccessToken(
                request(app).delete(testRoute())
            ).expect(constants.HTTP_STATUS_NOT_FOUND)

            await withAccessToken(
                request(app).delete(testRoute('number'))
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

            await withAccessToken(
                request(app).delete(testRoute(Campaign1.campaignNumber, 'number'))
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

        });

        it('should delete linked campaigns, events and campaign housing', async () => {

            await withAccessToken(
                request(app).delete(testRoute(Campaign1.campaignNumber))
            ).expect(constants.HTTP_STATUS_OK);

            await db(campaignsTable)
                .where('establishment_id', Establishment1.id)
                .andWhere('campaign_number', '1')
                .then(result => {
                    expect(result).toEqual([])
                });

            await db(campaignsHousingTable)
                .join(campaignsTable, 'campaign_id', 'id')
                .where('establishment_id', Establishment1.id)
                .andWhere('campaign_number', '1')
                .then(result => {
                    expect(result).toEqual([])
                });

            await db(eventsTable)
                .join(campaignsTable, 'campaign_id', `${campaignsTable}.id`)
                .where('establishment_id', Establishment1.id)
                .andWhere('campaign_number', '1')
                .then(result => {
                    expect(result).toEqual([])
                });
        })

    })


});

