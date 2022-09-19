import db from '../repositories/db';
import protectedRouter from '../routers/protected';
import express from 'express';
import request from 'supertest';
import { withAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import bodyParser from 'body-parser';
import housingRepository, { housingTable } from '../repositories/housingRepository';
import { genHousingApi } from '../test/testFixtures';
import { Locality1 } from '../../database/seeds/test/001-establishments';
import { Owner1 } from '../../database/seeds/test/003-owner';
import ownerRepository from '../repositories/ownerRepository';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(protectedRouter);

describe('Housing controller', () => {

    describe('list', () => {

        const testRoute = '/api/housing'

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).post(testRoute).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should return the housing list for a query filter', async () => {

            const queriedHousing = {...genHousingApi(Locality1.geoCode), rawAddress: ['line1 with   many      spaces', 'line2']};

            await db(housingTable)
                .insert(housingRepository.formatHousingApi(queriedHousing));

            await ownerRepository.insertHousingOwners([{...Owner1, housingId: queriedHousing.id, rank: 1}])

            const res = await withAccessToken(
                request(app).post(testRoute)
            )
                .send({
                    page: 1,
                    perPage: 10,
                    filters: { query: 'line1   with many spaces'}
                })
                .expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                {
                    entities: expect.arrayContaining([expect.objectContaining({
                        id: queriedHousing.id
                    })]),
                    page: 1,
                    perPage: 10,
                    totalCount: 1
                }
            )
        })
    })


});

