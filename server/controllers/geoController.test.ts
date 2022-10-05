import protectedRouter from '../routers/protected';
import express from 'express';
import request from 'supertest';
import { withAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import bodyParser from 'body-parser';
import { GeoPerimeter1, GeoPerimeter2 } from '../../database/seeds/test/006-geo-perimeters';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import geoRepository from '../repositories/geoRepository';
const randomstring = require('randomstring');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(protectedRouter);

describe('Geo controller', () => {

    describe('listGeoPerimeters', () => {

        const testRoute = '/api/geo/perimeters'

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).get(testRoute).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should list the geo perimeters for the authenticated user', async () => {

           const res = await withAccessToken(
               request(app).get(testRoute)
           ).expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: GeoPerimeter1.id,
                        establishmentId: Establishment1.id,
                        name: GeoPerimeter1.name,
                        type: GeoPerimeter1.kind,
                    })
                ])
            )
            expect(res.body).not.toMatchObject(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: GeoPerimeter2.id,
                    })
                ])
            )
        })

    })

    describe('deleteGeoPerimeter', () => {

        const testRoute = (geoPerimeterId?: string) => `/api/geo/perimeters${geoPerimeterId ? '/' + geoPerimeterId : ''}`

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).delete(testRoute(GeoPerimeter1.id)).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should be forbidden for a user from another establishment', async () => {
            await withAccessToken(
                request(app).delete(testRoute(GeoPerimeter2.id))
            ).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should received a valid geo perimeter id', async () => {

            await withAccessToken(
                request(app).delete(testRoute())
            ).expect(constants.HTTP_STATUS_NOT_FOUND)

            await withAccessToken(
                request(app).delete(testRoute('id'))
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

        });

        it('should delete the perimeter', async () => {
            await withAccessToken(
                request(app).delete(testRoute(GeoPerimeter1.id))
            ).expect(constants.HTTP_STATUS_OK);

            await geoRepository.listGeoPerimeters(GeoPerimeter1.establishmentId)
                .then(result => {
                    expect(result).toEqual([])
                });
        })

    })

    describe('updateGeoPerimeter', () => {

        const testRoute = (geoPerimeterId?: string) => `/api/geo/perimeters${geoPerimeterId ? '/' + geoPerimeterId : ''}`

        it('should be forbidden for a not authenticated user', async () => {
            await request(app).put(testRoute(GeoPerimeter1.id)).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should be forbidden for a user from another establishment', async () => {
            await withAccessToken(
                request(app).put(testRoute(GeoPerimeter2.id))
            )
                .send({
                    type: randomstring.generate(),
                    name: randomstring.generate()
                }).expect(constants.HTTP_STATUS_UNAUTHORIZED);
        })

        it('should received valid parameters', async () => {

            await withAccessToken(
                request(app).put(testRoute())
            ).expect(constants.HTTP_STATUS_NOT_FOUND)

            await withAccessToken(
                request(app).put(testRoute('id'))
            ).expect(constants.HTTP_STATUS_BAD_REQUEST)

            await withAccessToken(
                request(app).put(testRoute(GeoPerimeter1.id))
            )
                .send({
                    name: randomstring.generate()
                }).expect(constants.HTTP_STATUS_BAD_REQUEST);

        });

        it('should update the perimeter', async () => {

            const newType: string = randomstring.generate();
            const newName: string = randomstring.generate();

            await withAccessToken(
                request(app).put(testRoute(GeoPerimeter1.id))
            )
                .send({
                    type: newType,
                    name: newName
                })
                .expect(constants.HTTP_STATUS_OK);

            await geoRepository.listGeoPerimeters(GeoPerimeter1.establishmentId)
                .then(result => {
                    expect(result).toMatchObject(
                        expect.arrayContaining([
                            expect.objectContaining({
                                id: GeoPerimeter1.id,
                                establishmentId: Establishment1.id,
                                name: newName,
                                type: newType,
                            })
                        ])
                    )
                });
        })

    })


});

