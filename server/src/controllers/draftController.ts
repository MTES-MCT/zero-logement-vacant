import { pdf } from '@zerologementvacant/draft';
import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftPreviewPayloadDTO,
  DraftUpdatePayloadDTO,
  getAddress,
  HOUSING_KIND_VALUES,
  isEmpty,
  replaceVariables
} from '@zerologementvacant/models';
import { not } from '@zerologementvacant/utils';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import CampaignMissingError from '~/errors/campaignMissingError';
import DraftMissingError from '~/errors/draftMissingError';
import { logger } from '~/infra/logger';
import { DraftApi, toDraftDTO } from '~/models/DraftApi';
import { SenderApi } from '~/models/SenderApi';
import campaignDraftRepository from '~/repositories/campaignDraftRepository';
import campaignRepository from '~/repositories/campaignRepository';
import draftRepository, { DraftFilters } from '~/repositories/draftRepository';
import senderRepository from '~/repositories/senderRepository';
import { isUUIDParam } from '~/utils/validators';

export interface DraftParams extends Record<string, string> {
  id: string;
}

interface DraftQuery {
  campaign?: string;
}

async function list(
  request: Request<never, DraftDTO[], never, DraftQuery>,
  response: Response<DraftDTO[]>
) {
  const { auth, query } = request as AuthenticatedRequest<
    never,
    DraftDTO[],
    never,
    DraftQuery
  >;

  const filters: DraftFilters = {
    ...(fp.pick(['campaign'], query) as DraftQuery),
    establishment: auth.establishmentId
  };
  const drafts: DraftApi[] = await draftRepository.find({
    filters
  });

  response.status(constants.HTTP_STATUS_OK).json(drafts.map(toDraftDTO));
}

const partialDraftValidators: ValidationChain[] = [
  body('body').optional({ nullable: true }).isString(),
  body('sender').optional({ nullable: true }).isObject(),
  body('logo').optional({ nullable: true }).isArray({ min: 0, max: 2 }),
  body('logo.*.*').optional().isString(),
  body('sender.signatoryFile').optional({ nullable: true }).isObject(),
  body('sender.signatoryFile.*').optional().isString()
];
const senderValidators: ValidationChain[] = [
  ...['name', 'service', 'firstName', 'lastName', 'address'].map((prop) =>
    body(`sender.${prop}`)
      .optional({ nullable: true })
      .isString()
      .withMessage(`${prop} must be a string`)
      .trim()
  ),
  ...[
    'email',
    'phone',
    'signatoryLastName',
    'signatoryFirstName',
    'signatoryRole'
  ].map((prop) =>
    body(`sender.${prop}`)
      .optional({ nullable: true })
      .isString()
      .withMessage(`${prop} must be a string`)
      .trim()
  )
];

async function create(
  request: Request<never, DraftDTO, DraftCreationPayloadDTO, never>,
  response: Response<DraftDTO>
) {
  const { auth, body } = request as AuthenticatedRequest<
    never,
    DraftDTO,
    DraftCreationPayloadDTO,
    never
  >;

  const campaign = await campaignRepository.findOne({
    id: body.campaign,
    establishmentId: auth.establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(body.campaign);
  }

  const sender: SenderApi = {
    id: uuidv4(),
    name: body.sender?.name ?? null,
    service: body.sender?.service ?? null,
    firstName: body.sender?.firstName ?? null,
    lastName: body.sender?.lastName ?? null,
    address: body.sender?.address ?? null,
    email: body.sender?.email ?? null,
    phone: body.sender?.phone ?? null,
    signatories: body.sender?.signatories ?? null,
    establishmentId: auth.establishmentId,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON()
  };
  const draft: DraftApi = {
    id: uuidv4(),
    subject: body.subject,
    body: body.body,
    logo: body.logo,
    sender,
    senderId: sender.id,
    writtenAt: body.writtenAt,
    writtenFrom: body.writtenFrom,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    establishmentId: auth.establishmentId
  };
  await senderRepository.save(sender);
  await draftRepository.save(draft);
  await campaignDraftRepository.save(campaign, draft);
  response.status(constants.HTTP_STATUS_CREATED).json(toDraftDTO(draft));
}

async function preview(
  request: Request<DraftParams, Buffer, DraftPreviewPayloadDTO>,
  response: Response<Buffer>
): Promise<void> {
  const { auth, body, params } = request as AuthenticatedRequest<
    DraftParams,
    Buffer,
    DraftPreviewPayloadDTO
  >;
  const draft = await draftRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!draft) {
    throw new DraftMissingError(params.id);
  }

  const transformer = pdf.createTransformer({ logger });
  const pdfBuffer = await transformer.generatePDF({
    subject: draft.subject,
    logo: draft.logo?.map(fp.pick(['id', 'content'])) ?? null,
    body: draft.body
      ? replaceVariables(draft.body, {
          housing: body.housing,
          owner: body.owner
        })
      : null,
    sender: {
      name: draft.sender.name,
      service: draft.sender.service,
      firstName: draft.sender.firstName,
      lastName: draft.sender.lastName,
      address: draft.sender.address,
      email: draft.sender.email,
      phone: draft.sender.phone,
      signatories:
        draft.sender.signatories
          ?.filter((signatory) => signatory !== null)
          ?.filter(not(isEmpty))
          ?.map((signatory) => ({
            ...signatory,
            file: signatory.file
              ? { id: signatory.file.id, content: signatory.file.content }
              : null
          })) ?? null
    },
    writtenAt: draft.writtenAt,
    writtenFrom: draft.writtenFrom,
    owner: {
      fullName: body.owner.fullName,
      address: getAddress(body.owner) ?? []
    }
  });
  response.status(constants.HTTP_STATUS_OK).type('pdf').send(pdfBuffer);
}

const previewValidators: ValidationChain[] = [
  isUUIDParam('id'),
  body('housing').isObject().withMessage('housing must be an object'),
  body('housing.geoCode')
    .isString()
    .withMessage('geoCode must be a string')
    .isLength({ min: 5, max: 5 })
    .withMessage('geoCode must be 5 characters long')
    .notEmpty()
    .withMessage('geoCode is required'),
  body('housing.localId').isString().isLength({ min: 12, max: 12 }),
  body('housing.rawAddress').isArray().isLength({ min: 1 }),
  body('housing.cadastralReference').isString().optional({
    nullable: true
  }),
  body('housing.housingKind')
    .isString()
    .withMessage('Must be a string')
    .isIn(HOUSING_KIND_VALUES)
    .withMessage(`Must be one of ${HOUSING_KIND_VALUES.join(', ')}`)
    .notEmpty()
    .withMessage('kind is required'),
  body('housing.livingArea').isInt().notEmpty(),
  body('housing.buildingYear')
    .optional({
      nullable: true
    })
    .isInt(),
  body('housing.energyConsumption')
    .optional({
      nullable: true
    })
    .isIn(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
  body('owner').isObject().withMessage('owner must be an object'),
  body('owner.fullName')
    .isString()
    .notEmpty()
    .withMessage('fullName is required'),
  body('owner.rawAddress').isArray().isLength({ min: 1 }),
  body('owner.rawAddress[*]')
    .isString()
    .notEmpty()
    .withMessage('address is required')
];

async function update(request: Request, response: Response<DraftDTO>) {
  const { auth, params } = request as AuthenticatedRequest;
  const body = request.body as DraftUpdatePayloadDTO;

  const draft = await draftRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!draft) {
    throw new DraftMissingError(params.id);
  }

  const sender: SenderApi = {
    id: draft.sender.id,
    name: body.sender.name,
    service: body.sender.service,
    firstName: body.sender.firstName,
    lastName: body.sender.lastName,
    address: body.sender.address,
    email: body.sender.email,
    phone: body.sender.phone,
    signatories: body.sender.signatories,
    createdAt: draft.sender.createdAt,
    updatedAt: new Date().toJSON(),
    establishmentId: draft.sender.establishmentId
  };
  const updated: DraftApi = {
    ...draft,
    subject: body.subject,
    body: body.body,
    logo: body.logo,
    sender,
    senderId: sender.id,
    writtenAt: body.writtenAt,
    writtenFrom: body.writtenFrom,
    updatedAt: new Date().toJSON()
  };
  await senderRepository.save(sender);
  await draftRepository.save(updated);
  logger.info('Draft updated', {
    draft: draft.id,
    establishment: auth.establishmentId
  });

  response.status(constants.HTTP_STATUS_OK).json(toDraftDTO(updated));
}
const updateValidators: ValidationChain[] = [
  isUUIDParam('id'),
  body('subject')
    .optional({ nullable: true })
    .isString()
    .withMessage('subject is required'),
  body('body')
    .optional({ nullable: true })
    .isString()
    .withMessage('body is required'),
  body('writtenAt')
    .optional({ nullable: true })
    .isString()
    .withMessage('writtenAt must be a string')
    .trim()
    .isLength({ min: 10, max: 10 })
    .isISO8601({ strict: true, strictSeparator: true }),
  body('writtenFrom')
    .optional({ nullable: true })
    .isString()
    .withMessage('writtenFrom must be a string')
    .trim()
    .withMessage('writtenFrom is required'),
  body('sender').isObject().withMessage('Sender must be an object'),
  ...partialDraftValidators,
  ...senderValidators
];

const draftController = {
  list,
  create,
  preview,
  previewValidators,
  update,
  updateValidators
};

export default draftController;
