import { mockRequests } from './requestUtils';
import { genCampaign, genGroup } from '../../../test/fixtures.test';
import config from '../config';

describe('Request utils', () => {
  describe('mockRequests', () => {
    it('should mock requests in any order', async () => {
      const campaign = genCampaign();
      const group = genGroup();

      mockRequests([
        {
          pathname: `/api/groups/${group.id}`,
          response: {
            status: 200,
            body: JSON.stringify(group),
          },
        },
        {
          pathname: `/api/campaigns/${campaign.id}`,
          response: {
            status: 200,
            body: JSON.stringify(campaign),
          },
        },
      ]);
      const campaigns = await fetch(
        `${config.apiEndpoint}/api/campaigns/${campaign.id}`
      );
      const groups = await fetch(
        `${config.apiEndpoint}/api/groups/${group.id}`
      );

      expect(fetch).toHaveBeenNthCalledWith(
        1,
        `${config.apiEndpoint}/api/campaigns/${campaign.id}`
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        `${config.apiEndpoint}/api/groups/${group.id}`
      );

      await expect(campaigns.json()).resolves.toMatchObject({
        id: campaign.id,
      });
      await expect(groups.json()).resolves.toMatchObject({
        id: group.id,
      });
    });

    it('should mock a request only once', async () => {
      const group = genGroup();

      mockRequests([
        {
          pathname: `/api/groups/${group.id}`,
          response: {
            status: 200,
            body: JSON.stringify(group),
          },
        },
      ]);

      await expect(
        fetch(`${config.apiEndpoint}/api/groups/${group.id}`)
      ).toResolve();
      await expect(
        fetch(`${config.apiEndpoint}/api/groups/${group.id}`)
      ).toReject();
    });

    it('should persist a request', async () => {
      const group = genGroup();

      mockRequests([
        {
          pathname: `/api/groups/${group.id}`,
          persist: true,
          response: {
            status: 200,
            body: JSON.stringify(group),
          },
        },
      ]);

      await expect(
        fetch(`${config.apiEndpoint}/api/groups/${group.id}`)
      ).toResolve();
      await expect(
        fetch(`${config.apiEndpoint}/api/groups/${group.id}`)
      ).toResolve();
    });
  });
});
