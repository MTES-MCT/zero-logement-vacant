import campaignController from './campaignController';
import { getMockReq, getMockRes } from '@jest-mock/express';

describe('Campaign controller', () => {

    it('should list campaigns', async () => {

        const req = getMockReq({
            user: {
                establishmentId: 'fb42415a-a41a-4b22-bf47-7bedfb419a63'
            }
        })
        const { res } = getMockRes()

        await campaignController.list(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
            expect.arrayContaining(
                [
                    expect.objectContaining({
                        campaignNumber: 1,
                        startMonth: '2111',
                        kind: '0',
                    })
                ]
            )
        )
    })

    // it('should create a new campaign', async () => {
    //
    //     const housingIds = ['ref1', 'ref2'];
    //
    //     const req = getMockReq({
    //         body: { draftCampaign: { startMonth: '2112', kind: '0'}, housingIds },
    //     })
    //     const { res } = getMockRes()
    //
    //     await campaignController.create(req, res)
    //
    //     expect(res.status).toHaveBeenCalledWith(200)
    //     expect(res.json).toHaveBeenCalledWith(
    //         expect.objectContaining({
    //                 campaign_number: 2,
    //                 start_month: '2112',
    //                 kind: '0',
    //             }
    //         )
    //     )
    //
    //     await db(campaignsHousingTable)
    //         .whereIn('housing_id', housingIds)
    //         .count('*').then(result => {
    //         expect(result).toStrictEqual([{count: "2"}])
    //     });
    //     await db(campaignsHousingTable)
    //         .whereIn('housing_id', housingIds)
    //         .countDistinct('campaignId').then(result => {
    //         expect(result).toStrictEqual([{count: "1"}])
    //     });
    // })



});

