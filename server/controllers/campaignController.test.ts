import campaignController from './campaignController';
import { getMockReq, getMockRes } from '@jest-mock/express'


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
                        name: 'Campagne 1s'
                    })
                ]
            )
        )
    })

});

