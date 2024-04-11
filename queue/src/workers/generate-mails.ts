import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';
import exceljs from 'exceljs';
import { Worker, WorkerOptions } from 'bullmq';
import { parseRedisUrl } from 'parse-redis-url-simple';
import { Readable } from 'node:stream';

import { Jobs } from '../jobs';
import campaignRepository from '../../../server/repositories/campaignRepository';
import CampaignMissingError from '../../../server/errors/campaignMissingError';
import draftRepository from '../../../server/repositories/draftRepository';
import DraftMissingError from '../../../server/errors/draftMissingError';
import pdf from '../../../server/utils/pdf';
import { slugify } from '../../../server/utils/stringUtils';
import config from '../config';
import { createLogger } from '../logger';
import housingRepository from '../../../server/repositories/housingRepository';
import ownerRepository from '../../../server/repositories/ownerRepository';
import { createS3 } from '../../../shared/utils/s3';
import DRAFT_TEMPLATE_FILE, {
  DraftData,
} from '../../../server/templates/draft';
import async from 'async';

type Name = 'campaign:generate';
type Args = Jobs[Name];

export default function createWorker() {
  const logger = createLogger('workers:generate-mails');
  logger.debug(`NODE_ENV=${process.env.NODE_ENV}`);
  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  });
  const [redis] = parseRedisUrl(config.redis.url);
  logger.debug(`redis URL: ${config.redis.url}`)
  logger.debug(`redis configuration: ${JSON.stringify(redis)}`)

  const workerConfig: WorkerOptions = {
    connection: redis,
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

      const housings = await housingRepository.find({
        filters: {
          campaignIds: [campaignId],
        },
      });

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

      const html: string[] = [];
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Liste des destinataires');
      worksheet.addRow(['Nom', 'Adresse']);

      await async.forEach(housings, async (housing) => {
        const owner = await ownerRepository.findByHousing(housing);

        worksheet.addRow([owner[0].fullName, owner[0].rawAddress.join(' - ')]);

        html.push(
          await pdf.compile<DraftData>(DRAFT_TEMPLATE_FILE, {
            ...draft,
            owner: {
              fullName: owner[0].fullName,
              rawAddress: owner[0].rawAddress.join(', '),
            },
          })
        );
      });

      const finalPDF = await pdf.fromHTML(html);
      logger.debug('Done writing PDF');
      const name = new Date()
        .toISOString()
        .substring(0, 'yyyy-mm-ddThh:mm:ss'.length)
        .replace(/[-T:]/g, '')
        .concat('-', slugify(campaign.title));

      const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());

      // Add files to an archive
      const archive = archiver('zip');
      archive.append(xlsxBuffer, { name: `${name}-destinataires.xlsx` });
      archive.append(finalPDF, { name: `${name}.pdf` });
      await archive.finalize();

      const command = new PutObjectCommand({
        Bucket: 'zerologementvacant',
        Key: `${name}.zip`,
        ContentLanguage: 'fr',
        Body: Readable.from(archive),
        ContentType: 'application/x-zip',
        ACL: 'authenticated-read',
      });

      await s3.send(command);

      const signedUrl = await getSignedUrl(s3, command, {
        expiresIn: 60 * 60 * 24, // TTL: 24 hours
      });
      logger.info('Generated signed URL');

      await campaignRepository.save({
        ...campaign,
        file: signedUrl,
      });
    },
    workerConfig
  );
}
