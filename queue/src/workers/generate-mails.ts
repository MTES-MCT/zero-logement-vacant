import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';
import async from 'async';
import { Worker, WorkerOptions } from 'bullmq';
import { parseRedisUrl } from 'parse-redis-url-simple';
import { Readable } from 'node:stream';

import { createSDK } from '@zerologementvacant/api-sdk';
import { DRAFT_TEMPLATE_FILE, DraftData, pdf } from '@zerologementvacant/draft';
import { getAddress, replaceVariables } from '@zerologementvacant/models';
import { createS3, slugify } from '@zerologementvacant/utils';
import { Jobs } from '../jobs';
import config from '../config';
import { createLogger } from '../logger';
import { storage } from '../storage';

type Name = 'campaign:generate';
type Args = Parameters<Jobs[Name]>[0];
type Returned = ReturnType<Jobs[Name]>;

export default function createWorker() {
  const logger = createLogger('workers:generate-mails');

  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  });

  const [redis] = parseRedisUrl(config.redis.url);
  const workerConfig: WorkerOptions = {
    connection: redis
  };

  logger.info('Worker created.', {
    name: 'workers:generate-mails'
  });

  const api = createSDK({
    api: {
      host: config.api.host
    },
    auth: {
      secret: config.auth.secret
    },
    db: {
      url: config.db.url
    },
    logger: createLogger('api-sdk'),
    serviceAccount: config.auth.serviceAccount,
    storage
  });
  logger.info('SDK created.');

  return new Worker<Args, Returned, Name>(
    'campaign:generate',
    async (job) => {
      return storage.run(
        { establishment: job.data.establishmentId },
        async () => {
          const payload = job.data;
          logger.info('Generating mail for campaign', job.data);

          const campaign = await api.campaign.get(payload.campaignId);
          if (!campaign) {
            throw new Error(`Campaign ${payload.campaignId} missing`);
          }

          const [housings, drafts] = await Promise.all([
            api.housing.find({
              filters: {
                campaignIds: [payload.campaignId]
              },
              pagination: {
                paginate: false
              }
            }),
            api.draft.find({
              filters: {
                campaign: campaign.id
              }
            })
          ]);

          const [draft] = drafts;
          if (!draft) {
            throw new Error('Draft missing');
          }

          const html: string[] = [];

          logger.debug('Generating PDF...');
          await async.forEachSeries(housings, async (housing) => {
            const address = getAddress(housing.owner);

            html.push(
              await pdf.compile<DraftData>(DRAFT_TEMPLATE_FILE, {
                subject: draft.subject ?? '',
                logo: draft.logo?.map((logo) => logo.content) ?? null,
                watermark: false,
                body: draft.body
                  ? replaceVariables(draft.body, {
                      housing,
                      owner: housing.owner
                    })
                  : '',
                sender: {
                  name: draft.sender.name,
                  service: draft.sender.service,
                  firstName: draft.sender.firstName,
                  lastName: draft.sender.lastName,
                  address: draft.sender.address,
                  phone: draft.sender.phone,
                  signatoryLastName: draft.sender.signatoryLastName,
                  signatoryFirstName: draft.sender.signatoryFirstName,
                  signatoryRole: draft.sender.signatoryRole,
                  signatoryFile: draft.sender.signatoryFile?.content ?? null
                },
                writtenAt: draft.writtenAt,
                writtenFrom: draft.writtenFrom,
                owner: {
                  fullName: housing.owner.fullName,
                  address: address
                }
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

          const archive = archiver('zip');
          const buffer: ArrayBuffer = await api.campaign.exportCampaign(
            campaign.id
          );
          logger.debug('Campaign exported');
          archive.append(Buffer.from(buffer), {
            name: `${name}-destinataires.xlsx`
          });
          archive.append(finalPDF, { name: `${name}.pdf` });

          archive.on('warning', (error) => {
            if (error.code === 'ENOENT') {
              logger.warn(error.message, { error });
            } else {
              throw error;
            }
          });

          archive.on('error', (error) => {
            logger.error('Archiver error', { error });
            throw error;
          });

          logger.debug('Generated archive', {
            file: `${name}.zip`
          });
          const upload = new Upload({
            client: s3,
            params: {
              Bucket: config.s3.bucket,
              Key: `${name}.zip`,
              Body: Readable.from(archive),
              ContentLanguage: 'fr',
              ContentType: 'application/x-zip',
              ACL: 'authenticated-read'
            }
          });

          upload.on('httpUploadProgress', (progress) => {
            if (progress.loaded && progress.total) {
              logger.debug('Upload in progress...', {
                key: progress.Key,
                bucket: progress.Bucket,
                loaded: progress.loaded,
                total: progress.total,
                percent: `${(progress.loaded / progress.total) * 100} %`
              });
            }
          });

          const [, result] = await Promise.all([
            archive.finalize(),
            upload.done()
          ]);
          const { Key } = result;

          logger.info('Uploaded file to S3');

          const command = new GetObjectCommand({
            Bucket: config.s3.bucket,
            Key: Key
          });

          const signedUrl = await getSignedUrl(s3, command, {
            expiresIn: 60 * 60 * 24 * 7 // TTL: 7 days
          });

          logger.info(`Generated signed URL: ${signedUrl}`);

          await api.campaign.update(campaign.id, {
            ...campaign,
            file: signedUrl
          });

          return { id: campaign.id };
        }
      );
    },
    workerConfig
  );
}
