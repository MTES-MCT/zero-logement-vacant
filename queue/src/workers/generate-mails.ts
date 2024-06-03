import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';
import async from 'async';
import { Worker, WorkerOptions } from 'bullmq';
import exceljs from 'exceljs';
import { parseRedisUrl } from 'parse-redis-url-simple';
import { Readable } from 'node:stream';

import { createSDK } from '@zerologementvacant/api-sdk';
import { DRAFT_TEMPLATE_FILE, DraftData, pdf } from '@zerologementvacant/draft';
import { getAddress, replaceVariables } from '@zerologementvacant/models';
import { createS3, slugify, toBase64 } from '@zerologementvacant/utils';
import { Jobs } from '../jobs';
import config from '../config';
import { createLogger } from '../logger';

type Name = 'campaign:generate';
type Args = Jobs[Name];

export default function createWorker() {
  const logger = createLogger('workers:generate-mails');

  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  });

  const [redis] = parseRedisUrl(config.redis.url);
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
      const api = createSDK({
        api: {
          host: config.api.host,
        },
        auth: {
          secret: config.auth.secret,
        },
        db: {
          url: config.db.url,
        },
        establishment: establishmentId,
        serviceAccount: config.auth.serviceAccount,
      });

      logger.info('Generating mail for campaign', job.data);

      const campaign = await api.campaign.get(campaignId);
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} missing`);
      }

      const [housings, drafts] = await Promise.all([
        api.housing.find({
          filters: {
            campaignIds: [campaignId],
          },
          pagination: {
            paginate: false,
          },
        }),
        api.draft.find({
          filters: {
            campaign: campaign.id,
          },
        }),
      ]);

      const [draft] = drafts;
      if (!draft) {
        throw new Error('Draft missing');
      }

      const html: string[] = [];
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Liste des destinataires');
      worksheet.addRow(['Nom', 'Adresse', 'Complément d’addresse']);

      // Download logos
      const logos = await async.map(draft.logo ?? [], async (logo: string) =>
        toBase64(logo, { s3, bucket: config.s3.bucket }),
      );
      const signature = draft.sender.signatoryFile
        ? await toBase64(draft.sender.signatoryFile, {
            s3,
            bucket: config.s3.bucket,
          })
        : null;

      await async.forEach(housings, async (housing) => {
        const owners = await api.owner.findByHousing(housing.id);
        const address = getAddress(owners[0]);

        worksheet.addRow([
          owners[0].fullName,
          address.join('\n'),
          owners[0].additionalAddress,
        ]);

        html.push(
          await pdf.compile<DraftData>(DRAFT_TEMPLATE_FILE, {
            subject: draft.subject ?? '',
            logo: logos,
            watermark: false,
            body: draft.body
              ? replaceVariables(draft.body, {
                  housing,
                  owner: owners[0],
                })
              : '',
            sender: {
              name: draft.sender.name ?? '',
              service: draft.sender.service ?? '',
              firstName: draft.sender.firstName ?? '',
              lastName: draft.sender.lastName ?? '',
              address: draft.sender.address ?? '',
              phone: draft.sender.phone ?? '',
              signatoryLastName: draft.sender.signatoryLastName ?? '',
              signatoryFirstName: draft.sender.signatoryFirstName ?? '',
              signatoryRole: draft.sender.signatoryRole ?? '',
              signatoryFile: signature,
            },
            writtenAt: draft.writtenAt ?? '',
            writtenFrom: draft.writtenFrom ?? '',
            owner: {
              fullName: owners[0].fullName,
              address: address,
              additionalAddress: owners[0].additionalAddress ?? '',
            },
          }),
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

      const archive = archiver('zip');
      archive.append(xlsxBuffer, { name: `${name}-destinataires.xlsx` });
      archive.append(finalPDF, { name: `${name}.pdf` });
      const upload = new Upload({
        client: s3,
        params: {
          Bucket: config.s3.bucket,
          Key: `${name}.zip`,
          Body: Readable.from(archive),
          ContentLanguage: 'fr',
          ContentType: 'application/x-zip',
          ACL: 'authenticated-read',
        },
      });
      const results = await Promise.all([archive.finalize(), upload.done()]);
      const objectKey = results[1].Key;

      const command = new GetObjectCommand({
        Bucket: config.s3.bucket,
        Key: objectKey,
      });

      const signedUrl = await getSignedUrl(s3, command, {
        expiresIn: 60 * 60 * 24 * 7, // TTL: 7 days
      });

      logger.info(`Generated signed URL: ${signedUrl}`);

      await api.campaign.update(campaign.id, {
        ...campaign,
        file: signedUrl,
      });
    },
    workerConfig,
  );
}
