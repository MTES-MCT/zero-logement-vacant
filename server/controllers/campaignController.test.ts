import campaignController from './campaignController';
import { getMockReq, getMockRes } from '@jest-mock/express';
import db from '../repositories/db';
import { campaignsHousingTable } from '../repositories/campaignHousingRepository';

describe('Campaign controller', () => {

    it('should list campaigns', async () => {

        const req = getMockReq()
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

    it('should create a new campaign', async () => {

        const housingIds = ['ref1', 'ref2'];

        const req = getMockReq({
            body: { draftCampaign: { startMonth: '2112', kind: '0'}, housingIds },
        })
        const { res } = getMockRes()

        await campaignController.create(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                    campaignNumber: 2,
                    startMonth: '2112',
                    kind: '0',
                }
            )
        )

        await db(campaignsHousingTable)
            .whereIn('housingRef', housingIds)
            .count('*').then(result => {
            expect(result).toStrictEqual([{count: "2"}])
        });
        await db(campaignsHousingTable)
            .whereIn('housingRef', housingIds)
            .countDistinct('campaignId').then(result => {
            expect(result).toStrictEqual([{count: "1"}])
        });
    })



});

