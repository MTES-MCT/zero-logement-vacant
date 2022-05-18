import campaignController from './campaignController';
import { getMockReq, getMockRes } from '@jest-mock/express';
import { campaignsHousingTable } from '../repositories/campaignHousingRepository';
import db from '../repositories/db';
import { campaignsTable } from '../repositories/campaignRepository';

describe('Campaign controller', () => {

    it('should list campaigns', async () => {

        const req = getMockReq({
            auth: {
                establishmentId: 'fb42415a-a41a-4b22-bf47-7bedfb419a63'
            }
        })
        const { res } = getMockRes()

        await campaignController.listCampaigns(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
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

