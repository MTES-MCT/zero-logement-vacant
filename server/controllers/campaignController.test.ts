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
import { Housing1, Housing2 } from '../../database/seeds/test/004-housing';
import { Campaign1 } from '../../database/seeds/test/005-campaigns';
import { eventsTable } from '../repositories/eventRepository';

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
                    campaignIds: [Campaign1.id],
                    housingCount: "1"
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

            const res = await withAccessToken(
                request(app).post(testRoute)
                    .set('Content-type', 'application/json')
            )
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
                .andWhere('campaign_number', '2')
                .then(result => {
                    expect(result).toEqual(expect.arrayContaining([
                        expect.objectContaining(
                            {
                                housing_id: Housing1.id
                            }
                        ),
                        expect.objectContaining(
                            {
                                housing_id: Housing2.id
                            }
                        )
                    ]))
                });
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
                    .set('Content-type', 'application/json')
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

