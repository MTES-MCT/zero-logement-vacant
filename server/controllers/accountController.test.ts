import protectedRouter from '../routers/protected';
import unprotectedRouter from '../routers/unprotected';
import express, { Request } from 'express';
import request from 'supertest';
import randomstring from 'randomstring';
import { constants } from 'http2';
import bodyParser from 'body-parser';
import { User1 } from '../../database/seeds/test/003-users';
import { genBoolean, genEmail, genNumber } from '../test/testFixtures';
import fetchMock from 'jest-fetch-mock';
import config from '../utils/config';
import db from '../repositories/db';
import { prospectsTable } from '../repositories/prospectRepository';
import { Prospect1 } from '../../database/seeds/test/007-prospects';
import { JsonObject } from 'type-fest';
import { Establishment1 } from "../../database/seeds/test/001-establishments";

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(unprotectedRouter);
app.use(protectedRouter);

beforeEach(() => {
    fetchMock.resetMocks();
});

const mockCeremaConsultUser = (email: string, user: JsonObject | undefined) => {
    fetchMock.mockResponse((request: Request) => {
        return Promise.resolve(
            (() => {
                if (request.url === `${config.cerema.api.endpoint}/api/consult/utilisateurs/?email=${email}`) {
                    return {
                        body: JSON.stringify(user ? [user] : []), init: { status: 200 }
                    }
                } else return { body: '', init: { status: 404 } }
            })()
        )
    });
}

describe('Account controller', () => {

    describe('getAccount', () => {

        const testRoute = (email: string) => `/api/prospects/${email}`

        it('should receive a valid email', async () => {

            await request(app).get(testRoute(''))
                .expect(constants.HTTP_STATUS_NOT_FOUND);

            await request(app).get(testRoute(randomstring.generate()))
                .expect(constants.HTTP_STATUS_BAD_REQUEST);

        });

        it('should return forbidden when a user already exist', async () => {

            await request(app).get(testRoute(User1.email))
                .expect(constants.HTTP_STATUS_FORBIDDEN);

        });

        it('should consult Cerema for a new prospect, then insert an return the result when user unknown from Cerema', async () => {

            const email = genEmail()

            mockCeremaConsultUser(email, undefined)

            const res = await request(app).get(testRoute(email))
                .expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject({
                email,
                hasAccount: false,
                hasCommitment: false
            })

            expect(fetchMock).toHaveBeenCalled();

            await db(prospectsTable)
                .where('email', email)
                .first()
                .then(result => {
                    expect(result).toEqual(expect.objectContaining({
                        email,
                        has_account: false,
                        has_commitment: false
                    }))
                });

        });

        it('should consult Cerema for a new prospect, then insert an return the result when user known from Cerema', async () => {

            const email = genEmail()
            const hasCommitment = genBoolean()
            const siren = Establishment1.siren

            mockCeremaConsultUser(email, {
                siret: String(siren) + String(genNumber(5)),
                lovac_ok: hasCommitment,
                email
            })

            const res = await request(app).get(testRoute(email))
                .expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject({
                email,
                hasAccount: true,
                hasCommitment,
                establishment: {
                    id: Establishment1.id,
                    siren: siren
                }
            })

            expect(fetchMock).toHaveBeenCalled();

            await db(prospectsTable)
                .where('email', email)
                .first()
                .then(result => {
                    expect(result).toEqual(expect.objectContaining({
                        email,
                        has_account: true,
                        has_commitment: hasCommitment,
                        establishment_siren: siren
                    }))
                });

        });

        it('should consult Cerema for an existing prospect, then update an return the result when user known from Cerema', async () => {

            const hasCommitment = genBoolean()
            const siren = Establishment1.siren

            mockCeremaConsultUser(Prospect1.email, {
                siret: String(siren) + String(genNumber(5)),
                lovac_ok: hasCommitment,
                email: Prospect1.email
            })

            const res = await request(app).get(testRoute(Prospect1.email))
                .expect(constants.HTTP_STATUS_OK);

            expect(res.body).toMatchObject({
                email: Prospect1.email,
                hasAccount: true,
                hasCommitment,
                establishment: {
                    id: Establishment1.id,
                    siren: siren
                }
            })

            expect(fetchMock).toHaveBeenCalled();

            await db(prospectsTable)
                .where('email', Prospect1.email)
                .first()
                .then(result => {
                    expect(result).toEqual(expect.objectContaining({
                        email: Prospect1.email,
                        has_account: true,
                        has_commitment: hasCommitment,
                        establishment_siren: siren
                    }))
                });

        });

    });

});

