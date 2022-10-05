import jwt from 'jsonwebtoken';
import { RequestUser } from '../models/UserApi';
import { Test } from 'supertest';
import { AdminUser1, User1 } from '../../database/seeds/test/003-users';

export const accessTokenTest = jwt.sign(<RequestUser>{ userId: User1.id, establishmentId: User1.establishmentId, role: User1.role }, 'secret', { expiresIn: 86400 })
export const adminAccessTokenTest = jwt.sign(<RequestUser>{ userId: AdminUser1.id, establishmentId: AdminUser1.establishmentId, role: AdminUser1.role }, 'secret', { expiresIn: 86400 })

export const withAccessToken = (test: Test) => test.set('x-access-token', accessTokenTest)
export const withAdminAccessToken = (test: Test) => test.set('x-access-token', adminAccessTokenTest)
