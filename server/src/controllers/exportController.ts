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
import { toCampaignDTO } from '~/models/CampaignApi';
import { toDraftDTO } from '~/models/DraftApi';
import { toHousingDTO } from '~/models/HousingApi';
import campaignRepository from '~/repositories/campaignRepository';
import draftRepository from '~/repositories/draftRepository';
import housingRepository from '~/repositories/housingRepository';

const s3 = createS3(config.s3);

const exportCampaign: RequestHandler<
  { id: CampaignDTO['id'] },
  never,
  never,
  never
> = async (request, response): Promise<void> => {
  const { auth, params } = request as AuthenticatedRequest<
    { id: CampaignDTO['id'] },
    never,
    never,
    never
  >;

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

const exportController = {
  exportCampaign
};

export default exportController;
