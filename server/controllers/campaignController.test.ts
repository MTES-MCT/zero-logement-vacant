import campaignController from './campaignController';
import { getMockReq, getMockRes } from '@jest-mock/express';
import { campaignsHousingTable } from '../repositories/campaignHousingRepository';
import db from '../repositories/db';
import { campaignsTable } from '../repositories/campaignRepository';
import protectedRouter from '../routers/protected';
import express from 'express';
import request from 'supertest';
import { withAccessToken } from '../test/testUtils';
import { constants } from 'http2';

const app = express();
app.use(protectedRouter);

describe('Campaign controller', () => {

    describe('Campaign getCampaignBundle', () => {

        const testRoute = (campaignNumber?: any, reminderNumber?: any) =>
            `/api/campaigns/bundles/number${campaignNumber ? '/' + campaignNumber + (reminderNumber !== undefined ? '/' + reminderNumber : '') : ''}`

        it('should received a valid campaign number', async () => {

            await withAccessToken(
                request(app).get(testRoute())
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

            await withAccessToken(
                request(app).get(testRoute('number'))
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

            await withAccessToken(
                request(app).get(testRoute(1, 'number'))
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

        });

        it('should return an error when there is no campaign bundle with the required ids', async () => {

            await withAccessToken(
                request(app).get(testRoute(999))
            ).expect(constants.HTTP_STATUS_NOT_FOUND)

        });

        it('should return the campaign bundle for the required ids', async () => {

           const res = await withAccessToken(
               request(app).get(testRoute(1, 0))
           ).expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.objectContaining({
                    campaignIds: ['db16f3c7-d284-4601-966e-b08534d74c1e'],
                    campaignNumber: 1,
                    reminderNumber: '0',
                    startMonth: '2111',
                })
            )
        })
    })


    describe('Campaign listCampaigns', () => {

        const testRoute = '/api/campaigns'

        it('should list campaigns for authenticated user', async () => {

            const res = await withAccessToken(
                request(app).get(testRoute)
            ).expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.arrayContaining(
                    [
                        expect.objectContaining({
                            campaignNumber: 1,
                            startMonth: '2111',
                            reminderNumber: 0,
                        })
                    ]
                )
            )
        })
    })

    it('should create a new campaign', async () => {

        const housingIds = ['c0ec7153-0e1c-4770-bc98-ad6ce1779f9a', '3180bb27-1ca8-4e32-bc71-79f04e424aa8'];

        const req = getMockReq({
            auth: {
                establishmentId: 'fb42415a-a41a-4b22-bf47-7bedfb419a63',
                userId: '8da707d6-ff58-4366-a2b3-59472c600dca'
            },
            body: {
                draftCampaign: {
                    startMonth: '2112',
                    reminderNumber: 0,
                    filters: {}
                },
                housingIds
            },
        })
        const { res } = getMockRes()

        await campaignController.createCampaign(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                startMonth: '2112',
                reminderNumber: 0
            })
        )

        await db(campaignsTable)
            .where('establishment_id', 'fb42415a-a41a-4b22-bf47-7bedfb419a63')
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
            .where('establishment_id', 'fb42415a-a41a-4b22-bf47-7bedfb419a63')
            .andWhere('campaign_number', '2')
            .then(result => {
                expect(result).toEqual(expect.arrayContaining([
                    expect.objectContaining(
                        {
                            housing_id: 'c0ec7153-0e1c-4770-bc98-ad6ce1779f9a'
                        }
                    ),
                    expect.objectContaining(
                    {
                            housing_id: '3180bb27-1ca8-4e32-bc71-79f04e424aa8'
                        }
                    )
                ]))
            });
    })



});

