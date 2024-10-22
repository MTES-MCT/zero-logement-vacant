import { Upload } from '@aws-sdk/lib-storage';

import archiver from 'archiver';
import { Worker, WorkerOptions } from 'bullmq';
import { parseRedisUrl } from 'parse-redis-url-simple';
import { Readable } from 'node:stream';

import { createSDK } from '@zerologementvacant/api-sdk';
import { DRAFT_TEMPLATE_FILE, DraftData, pdf } from '@zerologementvacant/draft';
import { getAddress, replaceVariables } from '@zerologementvacant/models';
import { createS3, slugify, timestamp } from '@zerologementvacant/utils';
import { Jobs } from '../jobs';
import config from '../config';
import { createLogger } from '../logger';
import { storage } from '../storage';

type Name = 'campaign-generate';
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
  const transformer = pdf.createTransformer({ logger });

  return new Worker<Args, Returned, Name>(
    'campaign-generate',
    async (job) => {
      return storage
        .run({ establishment: job.data.establishmentId }, async () => {
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
              paginate: false
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

          logger.debug('Generating PDF...');
          const htmls = housings.map((housing) => {
            const address = getAddress(housing.owner);

            return transformer.compile<DraftData>(DRAFT_TEMPLATE_FILE, {
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
                email: draft.sender.email,
                address: draft.sender.address,
                phone: draft.sender.phone,
                signatories:
                  draft.sender.signatories
                    ?.filter((signatory) => signatory !== null)
                    ?.map((signatory) => ({
                      ...signatory,
                      file: signatory.file?.content ?? null
                    })) ?? null
              },
              writtenAt: draft.writtenAt,
              writtenFrom: draft.writtenFrom,
              owner: {
                fullName: housing.owner.fullName,
                address: address
              }
            });
          });

          const finalPDF = await transformer.fromHTML(htmls);
          logger.debug('Done writing PDF');
          const name = timestamp().concat('-', slugify(campaign.title));

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

          await api.campaign.update(campaign.id, {
            ...campaign,
            file: Key
          });

          return { id: campaign.id };
        })
        .catch((error) => {
          logger.error('Campaign archive generation failed', {
            error: {
              message: error.message
            }
          });
          throw error;
        });
    },
    workerConfig
  );
}
