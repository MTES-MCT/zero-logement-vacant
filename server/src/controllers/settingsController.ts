import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';

import SettingsMissingError from '~/errors/settingsMissingError';
import settingsRepository from '~/repositories/settingsRepository';
import establishmentRepository from '~/repositories/establishmentRepository';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import { SettingsApi, toDBO } from '~/models/SettingsApi';
import { logger } from '~/infra/logger';

async function getSettings(request: Request, response: Response) {
  const { auth } = request as AuthenticatedRequest;

  const id = request.params.id ?? auth.establishmentId;
  logger.info('Get settings', id);

  const settings = await settingsRepository.findOne({
    establishmentId: id,
  });

  if (!settings) {
    throw new SettingsMissingError({ establishmentId: id });
  }
  response.status(constants.HTTP_STATUS_OK).json(toDBO(settings));
}

const getSettingsValidators: ValidationChain[] = [
  param('id').isString().notEmpty(),
];

async function updateSettings(request: Request, response: Response) {
  const { auth, body } = request as AuthenticatedRequest;
  // Could be the given establishmentId param in a future with access control
  const { establishmentId } = auth;

  logger.info('Update settings', establishmentId);

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
    inbox: existingSettings?.inbox ?? {
      enabled: true,
    },
  };
  await settingsRepository.upsert(newSettings);
  response.status(status).json(toDBO(newSettings));
}

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
