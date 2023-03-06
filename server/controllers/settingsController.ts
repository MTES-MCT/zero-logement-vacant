import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import SettingsMissingError from '../errors/settingsMissingError';
import settingsRepository from '../repositories/settingsRepository';
import { body, param, ValidationChain } from 'express-validator';
import establishmentRepository from '../repositories/establishmentRepository';
import EstablishmentMissingError from '../errors/establishmentMissingError';
import { SettingsApi, toDBO } from '../models/SettingsApi';

const getSettings = async (request: Request, response: Response) => {
  const { auth } = request as AuthenticatedRequest;

  console.log('Get settings', auth.establishmentId);

  const settings = await settingsRepository.findOne({
    // Could be the given establishmentId param in a future with access control
    establishmentId: auth.establishmentId,
  });

  if (!settings) {
    throw new SettingsMissingError({ establishmentId: auth.establishmentId });
  }
  response.status(constants.HTTP_STATUS_OK).json(toDBO(settings));
};

const getSettingsValidators: ValidationChain[] = [
  param('id').isString().notEmpty(),
];

const updateSettings = async (request: Request, response: Response) => {
  const { auth, body } = request as AuthenticatedRequest;
  // Could be the given establishmentId param in a future with access control
  const { establishmentId } = auth;

  console.log('Update settings', establishmentId);

  const establishment = await establishmentRepository.get(establishmentId);
  if (!establishment) {
    throw new EstablishmentMissingError(establishmentId);
  }

  const existingSettings = await settingsRepository.findOne({
    establishmentId,
  });

  const status = existingSettings
    ? constants.HTTP_STATUS_OK
    : constants.HTTP_STATUS_CREATED;

  const newSettings: SettingsApi = {
    id: existingSettings?.id ?? uuidv4(),
    establishmentId,
    contactPoints: {
      public: body.contactPoints.public,
    },
  };
  await settingsRepository.upsert(newSettings);
  response.status(status).json(toDBO(newSettings));
};

const updateSettingsValidators: ValidationChain[] = [
  param('id').isString().notEmpty(),
  body('contactPoints').isObject({ strict: true }),
  body('contactPoints.public').default(false).isBoolean({ strict: true }),
];

export default {
  getSettings,
  getSettingsValidators,
  updateSettings,
  updateSettingsValidators,
};
