import jwt from 'jsonwebtoken';
import { RequestUser, UserRoles } from '../models/UserApi';
import { Test } from 'supertest';

export const accessTokenTest = jwt.sign(<RequestUser>{ userId: '8da707d6-ff58-4366-a2b3-59472c600dca', establishmentId: 'fb42415a-a41a-4b22-bf47-7bedfb419a63', role: UserRoles.Usual }, 'secret', { expiresIn: 86400 })

export const withAccessToken = (test: Test) => test.set('x-access-token', accessTokenTest)
