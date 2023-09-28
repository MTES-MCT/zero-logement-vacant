import { Request, Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignApi, CampaignSteps } from '../models/CampaignApi';
import housingRepository from '../repositories/housingRepository';
import eventRepository from '../repositories/eventRepository';
import localityRepository from '../repositories/localityRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param, validationResult } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import { HousingApi } from '../models/HousingApi';
import async from 'async';
import { HousingFiltersApi } from '../models/HousingFiltersApi';
import { logger } from '../utils/logger';
import CampaignBundleMissingError from '../errors/campaignBundleMissingError';

const getCampaignBundleValidators = [
  param('campaignNumber').optional({ nullable: true }).isNumeric(),
  param('reminderNumber').optional({ nullable: true }).isNumeric(),
];

const getCampaignBundle = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  const campaignNumber = request.params.campaignNumber;
  const reminderNumber = request.params.reminderNumber;
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;
  const query = <string>request.query.q;

  logger.debug('Get campaign bundle', {
    establishment: establishmentId,
    campaign: campaignNumber,
    reminder: reminderNumber,
  });

  return campaignRepository
    .getCampaignBundle(establishmentId, campaignNumber, reminderNumber, query)
    .then((campaignBundle) =>
      campaignBundle
        ? response.status(constants.HTTP_STATUS_OK).json(campaignBundle)
        : response.sendStatus(constants.HTTP_STATUS_NOT_FOUND)
    );
};

const listCampaigns = async (request: Request, response: Response) => {
  logger.trace('List campaigns');

  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;

  const campaigns = await campaignRepository.listCampaigns(establishmentId);
  response.status(constants.HTTP_STATUS_OK).json(campaigns);
};

const listCampaignBundles = async (request: Request, response: Response) => {
  console.log('List campaign bundles');

  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;

  const bundles = await campaignRepository.listCampaignBundles(establishmentId);
  response.status(constants.HTTP_STATUS_OK).json(bundles);
};

const createCampaign = async (
  request: Request,
  response: Response
): Promise<Response> => {
  console.log('Create campaign');

  const { establishmentId, userId } = (request as AuthenticatedRequest).auth;

  const kind = request.body.draftCampaign.kind;
  const filters = request.body.draftCampaign.filters;
  const title = request.body.draftCampaign.title;
  const allHousing = request.body.allHousing;

  const lastNumber = await campaignRepository.lastCampaignNumber(
    establishmentId
  );
  const newCampaignApi = await campaignRepository.insert(<CampaignApi>{
    establishmentId,
    campaignNumber: (lastNumber ?? 0) + 1,
    kind,
    reminderNumber: 0,
    filters,
    createdBy: userId,
    validatedAt: new Date(),
    title,
  });

  const userLocalities = await localityRepository
    .listByEstablishmentId(establishmentId)
    .then((_) => _.map((_) => _.geoCode));

  const filterLocalities = (filters.localities ?? []).length
    ? userLocalities.filter((l) => (filters.localities ?? []).indexOf(l) !== -1)
    : userLocalities;

  const housingList = allHousing
    ? await housingRepository
        .find({
          filters: {
            ...filters,
            establishmentIds: [establishmentId],
            localities: filterLocalities,
          },
          pagination: { paginate: false },
        })
        .then((housingList) =>
          housingList.filter(
            (housing) => !request.body.housingIds.includes(housing.id)
          )
        )
    : await housingRepository.find({
        filters: {
          establishmentIds: [establishmentId],
          housingIds: request.body.housingIds,
        },
        pagination: {
          paginate: false,
        },
      });

  const housingIds = housingList.map((_) => _.id);

  await campaignHousingRepository.insertHousingList(
    newCampaignApi.id,
    housingList
  );

  await removeHousingFromDefaultCampaign(housingIds, establishmentId);

  const newHousingList = await housingRepository.find({
    filters: {
      establishmentIds: [establishmentId],
      housingIds,
    },
    pagination: {
      paginate: false,
    },
  });

  await eventRepository.insertManyHousingEvents(
    housingList.map((housing) => ({
      id: uuidv4(),
      name: 'Ajout dans une campagne',
      kind: 'Create',
      category: 'Campaign',
      section: 'Suivi de campagne',
      old: housingList.find((_) => _.id === housing.id),
      new: newHousingList
        .map((housing) => ({ ...housing, campaignIds: [newCampaignApi.id] }))
        .find((_) => _.id === housing.id),
      createdBy: userId,
      createdAt: new Date(),
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
    }))
  );

  return response.status(constants.HTTP_STATUS_OK).json(newCampaignApi);
};

const removeHousingFromDefaultCampaign = (
  housingIds: string[],
  establishmentId: string
) => {
  return campaignRepository
    .getCampaignBundle(establishmentId, '0')
    .then((defaultCampaign) =>
      campaignHousingRepository.deleteHousingFromCampaigns(
        defaultCampaign ? defaultCampaign.campaignIds : [],
        housingIds
      )
    );
};

const createReminderCampaign = async (request: Request, response: Response) => {
  const campaignNumber = request.params.campaignNumber;
  const reminderNumber = request.params.reminderNumber;
  const { establishmentId, userId } = (request as AuthenticatedRequest).auth;

  logger.info('Create reminder campaign', {
    establishment: establishmentId,
    campaign: campaignNumber,
    reminder: reminderNumber,
  });

  const kind = request.body.kind;
  const allHousing = request.body.allHousing;

  const campaignBundle = await campaignRepository.getCampaignBundle(
    establishmentId,
    campaignNumber,
    reminderNumber
  );
  if (!campaignBundle) {
    throw new CampaignBundleMissingError({
      establishmentId,
      campaignNumber,
      reminderNumber,
    });
  }

  const lastReminderNumber = await campaignRepository.lastReminderNumber(
    establishmentId,
    campaignBundle.campaignNumber
  );

  const newCampaignApi = await campaignRepository.insert({
    id: uuidv4(),
    establishmentId,
    campaignNumber: campaignBundle.campaignNumber,
    kind,
    title: campaignBundle.title,
    reminderNumber: lastReminderNumber + 1,
    filters: campaignBundle.filters,
    createdBy: userId,
    validatedAt: new Date(),
  });

  const housingIds = allHousing
    ? await housingRepository
        .find({
          filters: {
            establishmentIds: [establishmentId],
            campaignIds: campaignBundle.campaignIds,
            status: HousingStatusApi.Waiting,
          },
          pagination: { paginate: false },
        })
        .then((housingList) =>
          housingList
            .map((housing) => housing.id)
            .filter((id) => !request.body.housingIds.includes(id))
        )
    : request.body.housingIds;

  await campaignHousingRepository.insertHousingList(
    newCampaignApi.id,
    housingIds
  );

  response.status(constants.HTTP_STATUS_OK).json(newCampaignApi);
};

const validateStepValidators = [
  param('campaignId').notEmpty().isUUID(),
  body('step')
    .notEmpty()
    .isIn([
      CampaignSteps.OwnersValidation,
      CampaignSteps.Export,
      CampaignSteps.Sending,
      CampaignSteps.Confirmation,
      CampaignSteps.InProgess,
      CampaignSteps.Archived,
    ]),
  body('sendingDate')
    .if(body('step').equals(String(CampaignSteps.Sending)))
    .notEmpty(),
  body('skipConfirmation')
    .if(body('step').equals(String(CampaignSteps.Sending)))
    .isBoolean({ strict: true })
    .default(false)
    .optional(),
];

const validateStep = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  const campaignId = request.params.campaignId;
  const step = request.body.step;
  const { establishmentId, userId } = (request as AuthenticatedRequest).auth;
  const skipConfirmation: boolean = request.body.skipConfirmation;

  logger.info('Validate campaign step', { campaignId, step });

  const campaignApi = await campaignRepository.getCampaign(campaignId);

  if (!campaignApi) {
    return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND);
  } else {
    const updatedCampaign = {
      ...campaignApi,
      validatedAt:
        step === CampaignSteps.OwnersValidation
          ? new Date()
          : campaignApi.validatedAt,
      exportedAt:
        step === CampaignSteps.Export ? new Date() : campaignApi.exportedAt,
      sentAt: step === CampaignSteps.Sending ? new Date() : campaignApi.sentAt,
      sendingDate:
        step === CampaignSteps.Sending
          ? request.body.sendingDate
          : campaignApi.sendingDate,
      confirmedAt:
        step === CampaignSteps.Confirmation ||
        (step === CampaignSteps.Sending && skipConfirmation)
          ? new Date()
          : campaignApi.confirmedAt,
      archivedAt:
        step === CampaignSteps.Archived ? new Date() : campaignApi.archivedAt,
    };

    if (step === CampaignSteps.Sending) {
      const housingList = await housingRepository.find({
        filters: {
          establishmentIds: [establishmentId],
          campaignIds: [campaignId],
        },
      });

      const updatedHousingList = housingList
        .filter((_) => !_.status)
        .map((housing) => ({
          ...housing,
          status: HousingStatusApi.Waiting,
        }));

      await async.map(updatedHousingList, async (updatedHousing: HousingApi) =>
        housingRepository.update(updatedHousing)
      );

      await eventRepository.insertManyHousingEvents(
        updatedHousingList.map((updatedHousing) => ({
          id: uuidv4(),
          name: 'Changement de statut de suivi',
          kind: 'Update',
          category: 'Campaign',
          section: 'Suivi de campagne',
          old: housingList.find((_) => _.id === updatedHousing.id),
          new: updatedHousing,
          createdBy: userId,
          createdAt: new Date(),
          housingId: updatedHousing.id,
          housingGeoCode: updatedHousing.geoCode,
        }))
      );
    }

    await eventRepository.insertCampaignEvent({
      id: uuidv4(),
      name: 'Modification du statut de la campagne',
      kind: 'Update',
      category: 'Campaign',
      section: 'Suivi de campagne',
      old: campaignApi,
      new: updatedCampaign,
      createdBy: userId,
      createdAt: new Date(),
      campaignId,
    });

    return campaignRepository
      .update(updatedCampaign)
      .then(() => campaignRepository.getCampaign(campaignId))
      .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
  }
};

const updateCampaignBundle = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const campaignNumber = Number(request.params.campaignNumber);
  const reminderNumber = request.params.reminderNumber
    ? Number(request.params.reminderNumber)
    : undefined;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  console.log(
    'Update campaign bundle infos for establishment',
    establishmentId,
    campaignNumber,
    reminderNumber
  );

  const title = request.body.title;

  const campaigns = await campaignRepository.listCampaigns(establishmentId);
  const campaignsToUpdate = campaigns.filter(
    (_) =>
      _.campaignNumber === campaignNumber &&
      (reminderNumber !== undefined
        ? _.reminderNumber === reminderNumber
        : true)
  );

  if (!campaignsToUpdate.length) {
    return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
  } else {
    return Promise.all(
      campaignsToUpdate.map((campaign) =>
        campaignRepository.update({
          ...campaign,
          title,
        })
      )
    ).then(() => response.sendStatus(constants.HTTP_STATUS_OK));
  }
};

const deleteCampaignBundleValidators = [
  param('campaignNumber').notEmpty().isNumeric(),
  param('reminderNumber').optional({ nullable: true }).isNumeric(),
];

const deleteCampaignBundle = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  const campaignNumber = Number(request.params.campaignNumber);
  const reminderNumber = request.params.reminderNumber
    ? Number(request.params.reminderNumber)
    : undefined;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  const campaigns = await campaignRepository.listCampaigns(establishmentId);

  const campaignIdsToDelete = campaigns
    .filter(
      (_) =>
        _.campaignNumber === campaignNumber &&
        (reminderNumber !== undefined
          ? _.reminderNumber === reminderNumber
          : true)
    )
    .map((_) => _.id);

  if (!campaignIdsToDelete.length) {
    return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
  } else {
    await campaignHousingRepository.deleteHousingFromCampaigns(
      campaignIdsToDelete
    );

    await eventRepository.removeCampaignEvents(campaignIdsToDelete);

    await campaignRepository.deleteCampaigns(campaignIdsToDelete);

    await resetHousingWithoutCampaigns(establishmentId);

    return Promise.all(
      campaigns
        .filter(
          (_) =>
            _.campaignNumber > campaignNumber && reminderNumber === undefined
        )
        .map((campaign) =>
          campaignRepository.update({
            ...campaign,
            campaignNumber: campaign.campaignNumber - 1,
          })
        )
    ).then(() => response.sendStatus(constants.HTTP_STATUS_OK));
  }
};

const resetHousingWithoutCampaigns = async (establishmentId: string) => {
  return housingRepository
    .find({
      filters: {
        establishmentIds: [establishmentId],
        campaignsCounts: ['0'],
        statusList: [
          HousingStatusApi.Waiting,
          HousingStatusApi.FirstContact,
          HousingStatusApi.InProgress,
          HousingStatusApi.Completed,
          HousingStatusApi.Blocked,
        ],
      },
      pagination: { paginate: false },
    })
    .then((results) =>
      Promise.all([
        resetWaitingHousingWithoutCampaigns(
          results.filter((_) => _.status === HousingStatusApi.Waiting)
        ),
        resetNotWaitingHousingWithoutCampaigns(
          establishmentId,
          results.filter((_) => _.status !== HousingStatusApi.Waiting)
        ),
      ])
    );
};

const resetWaitingHousingWithoutCampaigns = async (
  housingList: HousingApi[]
) => {
  return async.map(housingList, async (housing: HousingApi) =>
    housingRepository.update({
      ...housing,
      status: HousingStatusApi.NeverContacted,
      subStatus: undefined,
    })
  );
};

const resetNotWaitingHousingWithoutCampaigns = async (
  establishmentId: string,
  housingList: HousingApi[]
) => {
  return housingList.length
    ? campaignRepository
        .getCampaignBundle(establishmentId, String(0))
        .then((campaignBundle) => {
          if (campaignBundle?.campaignIds[0]) {
            return campaignHousingRepository.insertHousingList(
              campaignBundle?.campaignIds[0],
              housingList
            );
          }
        })
    : Promise.resolve();
};

const removeHousingList = async (
  request: Request,
  response: Response
): Promise<Response> => {
  console.log('Remove campaign housing list');

  const campaignId = request.params.campaignId;
  const filters = <HousingFiltersApi>request.body.filters;
  const allHousing = <boolean>request.body.allHousing;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  const housingIds = await housingRepository
    .find({
      filters: {
        ...filters,
        establishmentIds: [establishmentId],
        campaignIds: [campaignId],
      },
      pagination: { paginate: false },
    })
    .then((_) =>
      _.map((_) => _.id).filter((id) =>
        allHousing
          ? request.body.housingIds.indexOf(id) === -1
          : request.body.housingIds.indexOf(id) !== -1
      )
    );

  return campaignHousingRepository
    .deleteHousingFromCampaigns([campaignId], housingIds)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const campaignController = {
  getCampaignBundleValidators,
  getCampaignBundle,
  listCampaigns,
  listCampaignBundles,
  createCampaign,
  createReminderCampaign,
  updateCampaignBundle,
  validateStepValidators,
  validateStep,
  deleteCampaignBundleValidators,
  deleteCampaignBundle,
  removeHousingList,
};

export default campaignController;
