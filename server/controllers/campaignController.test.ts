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
                        name: 'Campagne 1'
                    })
                ]
            )
        )
    })

    it('should create a new campaign', async () => {

        const housingIds = ['ref1', 'ref2'];

        const req = getMockReq({
            body: { name: 'Campagne 2', housingIds },
        })
        const { res } = getMockRes()

        await campaignController.create(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({count: 2})

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

