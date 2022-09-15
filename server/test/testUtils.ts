import jwt from 'jsonwebtoken';
import { RequestUser } from '../models/UserApi';
import { Test } from 'supertest';
import { User1 } from '../../database/seed/test/002-users';

export const accessTokenTest = jwt.sign(<RequestUser>{ userId: User1.id, establishmentId: User1.establishmentId, role: User1.role }, 'secret', { expiresIn: 86400 })

export const withAccessToken = (test: Test) => test.set('x-access-token', accessTokenTest)
