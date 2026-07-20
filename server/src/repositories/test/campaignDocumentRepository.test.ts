import { faker } from '@faker-js/faker/locale/fr';

import { CampaignApi } from '~/models/CampaignApi';
import { CampaignDocumentApi } from '~/models/CampaignDocumentApi';
import campaignDocumentRepository, {
  CampaignDocuments,
  toCampaignDocumentDBO,
  type CampaignDocumentDBO
} from '~/repositories/campaignDocumentRepository';
import { Documents, toDocumentDBO } from '~/repositories/documentRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { factories } from '~/test/factories';
import {
  genCampaignDocumentApi,
  genEstablishmentApi,
  genUserApi
} from '~/test/testFixtures';

describe('Campaign document repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  describe('link', () => {
    it('should create document-campaign link', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const campaignDocument = genCampaignDocumentApi({
        createdBy: user.id,
        creator: user,
        campaignId: campaign.id
      });
      await Documents().insert(toDocumentDBO(campaignDocument));

      await campaignDocumentRepository.link(campaignDocument);

      const actual = await CampaignDocuments()
        .where('document_id', campaignDocument.id)
        .first();

      expect(actual).toMatchObject({
        document_id: campaignDocument.id,
        campaign_id: campaign.id
      });
    });

    it('should be idempotent (ignore duplicate links)', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const campaignDocument = genCampaignDocumentApi({
        createdBy: user.id,
        creator: user,
        campaignId: campaign.id
      });
      await Documents().insert(toDocumentDBO(campaignDocument));

      await campaignDocumentRepository.link(campaignDocument);
      await campaignDocumentRepository.link(campaignDocument);

      const actual = await CampaignDocuments().where(
        'document_id',
        campaignDocument.id
      );
      expect(actual).toHaveLength(1);
    });
  });

  describe('linkMany', () => {
    it('should create multiple document-campaign links (cartesian product)', async () => {
      const campaigns = await factories
        .campaign(establishment)
        .createList(2, {}, { associations: { createdBy: user } });

      const campaignDocuments = [
        genCampaignDocumentApi({ createdBy: user.id, creator: user }),
        genCampaignDocumentApi({ createdBy: user.id, creator: user })
      ];
      await Documents().insert(campaignDocuments.map(toDocumentDBO));

      const links = campaignDocuments.flatMap((d) =>
        campaigns.map((c) => ({
          document_id: d.id,
          campaign_id: c.id
        }))
      );
      await campaignDocumentRepository.linkMany(links);

      const allLinks = await CampaignDocuments().whereIn(
        'document_id',
        campaignDocuments.map((d) => d.id)
      );

      expect(allLinks).toHaveLength(4);
    });

    it('should handle empty arrays', async () => {
      await expect(
        campaignDocumentRepository.linkMany([])
      ).resolves.not.toThrow();
    });
  });

  describe('unlink', () => {
    it('should remove document-campaign link', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const campaignDocument = genCampaignDocumentApi({
        createdBy: user.id,
        creator: user,
        campaignId: campaign.id
      });
      await Documents().insert(toDocumentDBO(campaignDocument));

      const linkDBO: CampaignDocumentDBO = {
        document_id: campaignDocument.id,
        campaign_id: campaign.id
      };
      await CampaignDocuments().insert(linkDBO);

      await campaignDocumentRepository.unlink({
        documentId: campaignDocument.id,
        campaignId: campaign.id
      });

      const actual = await CampaignDocuments().where(
        'document_id',
        campaignDocument.id
      );
      expect(actual).toHaveLength(0);
    });
  });

  describe('get', () => {
    let campaign: CampaignApi;
    let document: CampaignDocumentApi;

    beforeAll(async () => {
      campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      document = genCampaignDocumentApi({
        createdBy: user.id,
        creator: user,
        campaignId: campaign.id
      });
      await Documents().insert(toDocumentDBO(document));
      await CampaignDocuments().insert(toCampaignDocumentDBO(document));
    });

    it('should return null if the document is missing', async () => {
      const actual = await campaignDocumentRepository.get(faker.string.uuid());

      expect(actual).toBeNull();
    });

    it('should return the document if it exists', async () => {
      const actual = await campaignDocumentRepository.get(document.id);

      expect(actual).toBeDefined();
      expect(actual).toMatchObject<Partial<CampaignDocumentApi>>({
        id: document.id,
        filename: document.filename,
        s3Key: document.s3Key,
        contentType: document.contentType,
        sizeBytes: document.sizeBytes,
        campaignId: campaign.id,
        createdBy: user.id
      });
    });

    it('should include creator information', async () => {
      const actual = await campaignDocumentRepository.get(document.id);

      expect(actual).toBeDefined();
      expect(actual!.creator).toBeDefined();
      expect(actual!.creator.id).toBe(user.id);
      expect(actual!.creator.email).toBe(user.email);
    });

    it('should return null when campaign does not match', async () => {
      const differentCampaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const actual = await campaignDocumentRepository.get(document.id, {
        campaign: [differentCampaign.id]
      });

      expect(actual).toBeNull();
    });
  });

  describe('remove', () => {
    it('should soft-delete the document', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genCampaignDocumentApi({
        createdBy: user.id,
        creator: user,
        campaignId: campaign.id
      });
      await Documents().insert(toDocumentDBO(document));
      await CampaignDocuments().insert(toCampaignDocumentDBO(document));

      await campaignDocumentRepository.remove(document);

      const actualDocument = await Documents()
        .where({ id: document.id })
        .first();

      expect(actualDocument).toBeDefined();
      expect(actualDocument!.deleted_at).not.toBeNull();

      const actualLink = await CampaignDocuments()
        .where({ document_id: document.id, campaign_id: campaign.id })
        .first();

      expect(actualLink).toBeDefined();
    });
  });

  describe('unlinkMany', () => {
    it('should unlink multiple documents from all campaigns', async () => {
      const campaigns = await factories
        .campaign(establishment)
        .createList(2, {}, { associations: { createdBy: user } });
      const campaignDocuments = [
        genCampaignDocumentApi({ createdBy: user.id, creator: user }),
        genCampaignDocumentApi({ createdBy: user.id, creator: user })
      ];

      await Documents().insert(campaignDocuments.map(toDocumentDBO));

      const links = campaignDocuments.flatMap((doc) =>
        campaigns.map((c) => ({
          document_id: doc.id,
          campaign_id: c.id
        }))
      );
      await campaignDocumentRepository.linkMany(links);

      const linksBefore = await CampaignDocuments().whereIn(
        'document_id',
        campaignDocuments.map((doc) => doc.id)
      );
      expect(linksBefore).toHaveLength(4);

      await campaignDocumentRepository.unlinkMany({
        documentIds: campaignDocuments.map((doc) => doc.id)
      });

      const linksAfter = await CampaignDocuments().whereIn(
        'document_id',
        campaignDocuments.map((doc) => doc.id)
      );
      expect(linksAfter).toBeEmpty();
    });

    it('should handle empty array', async () => {
      await expect(
        campaignDocumentRepository.unlinkMany({ documentIds: [] })
      ).resolves.not.toThrow();
    });

    it('should only unlink specified documents', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const documents = [
        genCampaignDocumentApi({
          createdBy: user.id,
          creator: user,
          campaignId: campaign.id
        }),
        genCampaignDocumentApi({
          createdBy: user.id,
          creator: user,
          campaignId: campaign.id
        })
      ];

      await Documents().insert(documents.map(toDocumentDBO));

      const links = documents.map((doc) => ({
        document_id: doc.id,
        campaign_id: campaign.id
      }));
      await campaignDocumentRepository.linkMany(links);

      await campaignDocumentRepository.unlinkMany({
        documentIds: [documents[0].id]
      });

      const remainingLinks = await CampaignDocuments().where({
        campaign_id: campaign.id
      });
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0].document_id).toBe(documents[1].id);
    });
  });
});
