import { hasPrimaryOwner, type CampaignDTO } from '@zerologementvacant/models';
import { generateCampaignPDFInWorker } from '@zerologementvacant/pdf/node';
import { createS3 } from '@zerologementvacant/utils/node';
import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'node:http2';
import { Writable } from 'node:stream';

import CampaignMissingError from '~/errors/campaignMissingError';
import DraftMissingError from '~/errors/draftMissingError';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import { toCampaignDTO } from '~/models/CampaignApi';
import { toDraftDTO } from '~/models/DraftApi';
import { toHousingDTO } from '~/models/HousingApi';
import campaignRepository from '~/repositories/campaignRepository';
import draftRepository from '~/repositories/draftRepository';
import housingRepository from '~/repositories/housingRepository';
import housingExportController from './housingExportController';
import { match } from 'ts-pattern';

const logger = createLogger('exportController');
const s3 = createS3(config.s3);

const exportCampaignDrafts: RequestHandler<
  { id: CampaignDTO['id'] },
  never,
  ExporterPayload,
  never
> = async (request, response): Promise<void> => {
  const { auth, params } = request as AuthenticatedRequest<
    { id: CampaignDTO['id'] },
    never,
    ExporterPayload,
    never
  >;
  logger.info('Exporting campaign drafts', {
    campaign: params.id,
    establishment: auth.establishmentId
  })

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  const [drafts, housings] = await Promise.all([
    draftRepository.find({
      filters: {
        campaign: campaign.id,
        establishment: auth.establishmentId
      }
    }),
    housingRepository.find({
      includes: ['owner'],
      filters: {
        campaignIds: [campaign.id],
        establishmentIds: [auth.establishmentId]
      },
      pagination: {
        paginate: false
      }
    })
  ]);
  const [draft] = drafts;
  if (!draft) {
    throw new DraftMissingError(campaign.id);
  }

  const housingsWithOwner = housings.map(toHousingDTO).filter(hasPrimaryOwner);

  const stream = await generateCampaignPDFInWorker({
    campaign: toCampaignDTO(campaign),
    draft: await toDraftDTO(draft, {
      s3,
      bucket: config.s3.bucket
    }),
    housings: housingsWithOwner
  });

  response
    .status(constants.HTTP_STATUS_ACCEPTED)
    .setHeader('Content-Type', 'application/pdf')
    .setHeader(
      'Content-Disposition',
      `attachment; filename="campaign-${campaign.id}.pdf"`
    );
  await stream.pipeTo(Writable.toWeb(response));
};

const exportCampaignRecipients: RequestHandler<
  { id: CampaignDTO['id'] },
  never,
  ExporterPayload,
  never
> = async (request, response): Promise<void> => {
  // Use the existing housing export controller
  // @ts-expect-error - Temporary type inference fix
  await housingExportController.exportCampaign(request, response);
};

interface ExporterPayload {
  type: 'drafts' | 'recipients';
}

/**
 * Controller to handle campaign exports.
 * Depending on the requested type, it either generates a PDF
 * with the campaign drafts or an Excel file
 * with the campaign recipients.
 * @param request
 * @param response
 * @param next
 * @returns
 */
const exporter: RequestHandler<
  { id: CampaignDTO['id'] },
  never,
  ExporterPayload,
  never
> = async (request, response, next): Promise<void> => {
  const { body } = request as AuthenticatedRequest<
    { id: CampaignDTO['id'] },
    never,
    ExporterPayload,
    never
  >;

  const exportFn = match(body)
    .with({ type: 'drafts' }, () => exportCampaignDrafts)
    .with({ type: 'recipients' }, () => exportCampaignRecipients)
    .exhaustive();
  return exportFn(request, response, next);
};

const exportController = {
  exporter,
  exportCampaignDrafts,
  exportCampaignRecipients
};

export default exportController;
