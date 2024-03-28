import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import archiver from 'archiver';
import { Worker, WorkerOptions } from 'bullmq';
import { Readable } from 'node:stream';

import { Jobs } from '../jobs';
import campaignRepository from '../../../server/repositories/campaignRepository';
import CampaignMissingError from '../../../server/errors/campaignMissingError';
import draftRepository from '../../../server/repositories/draftRepository';
import DraftMissingError from '../../../server/errors/draftMissingError';
import pdf from '../../../server/utils/pdf';
import DRAFT_TEMPLATE_FILE from '../../../server/templates/draft';
import { slugify } from '../../../server/utils/stringUtils';
import config from '../config';
import { createLogger } from '../logger';

type Name = 'campaign:generate';
type Args = Jobs[Name];

export default function createWorker() {
  const logger = createLogger('workers:generate-mails');
  const s3 = new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
    },
  });
  const workerConfig: WorkerOptions = {
    connection: {
      host: config.redis.host,
      port: config.redis.port,
      username: config.redis.username ?? undefined,
      password: config.redis.password ?? undefined,
    },
  };

  logger.info('Worker created', {
    name: 'workers:generate-mails',
  });

  return new Worker<Args, void, Name>(
    'campaign:generate',
    async (job) => {
      const { campaignId, establishmentId } = job.data;

      logger.info('Generating mail for campaign', job.data);

      const campaign = await campaignRepository.findOne({
        id: campaignId,
        establishmentId,
      });
      if (!campaign) {
        throw new CampaignMissingError(campaignId);
      }

      const drafts = await draftRepository.find({
        filters: {
          campaign: campaign.id,
          establishment: establishmentId,
        },
      });
      const [draft] = drafts;
      if (!draft) {
        throw new DraftMissingError('');
      }

      const html = await pdf.compile(DRAFT_TEMPLATE_FILE, {
        body: draft.body,
        sender: draft.sender,
      });
      const finalPDF = await pdf.fromHTML(html);
      logger.debug('Done writing PDF');
      const name = new Date()
        .toISOString()
        .substring(0, 'yyyy-mm-ddThh:mm:ss'.length)
        .replace(/[-T:]/g, '')
        .concat('-', slugify(campaign.title));

      // Add files to an archive
      const archive = archiver('zip');
      archive.append(finalPDF, { name: `${name}.pdf` });
      await archive.finalize();

      const upload = new Upload({
        client: s3,
        params: {
          // ACL: 'authenticated-read'
          Bucket: 'zerologementvacant',
          Key: `${name}.zip`,
          Body: Readable.from(archive),
          ContentLanguage: 'fr',
          ContentType: 'application/x-zip',
        },
      });

      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          logger.debug('Uploading...', {
            progress: (progress.loaded * 100) / progress.total,
          });
        }
      });

      const { Key: file } = await upload.done();

      await campaignRepository.save({
        ...campaign,
        file: `${config.s3.endpoint}/${config.s3.bucket}/${file}`,
      });
      // TODO: create a multi-page PDF
    },
    workerConfig
  );
}
