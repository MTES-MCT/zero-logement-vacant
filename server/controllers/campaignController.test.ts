import campaignController from './campaignController';
import { getMockReq, getMockRes } from '@jest-mock/express';
import db from '../repositories/db';

describe('Campaign controller', () => {

    afterAll(async () => {
        await db.destroy()
    });

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

});

