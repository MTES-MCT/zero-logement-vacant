import { faker } from '@faker-js/faker';
import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import {
  genGroupDTO,
  GroupDTO,
  GroupPayloadDTO
} from '@zerologementvacant/models';
import config from '../../utils/config';
import data from './data';

type GroupParams = {
  id: string;
};

export const groupHandlers: RequestHandler[] = [
  http.get<Record<string, never>, never, GroupDTO[]>(
    `${config.apiEndpoint}/api/groups`,
    () => {
      return HttpResponse.json(data.groups);
    }
  ),
  http.post<Record<string, never>, GroupPayloadDTO, GroupDTO>(
    `${config.apiEndpoint}/api/groups`,
    () => {
      const creator = faker.helpers.arrayElement(data.users);
      // TODO: use request payload
      const housings = faker.helpers.arrayElements(data.housings);
      const group = genGroupDTO(creator, housings);
      data.groups.push(group);
      data.groupHousings.set(group.id, housings);

      return HttpResponse.json(group, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),
  http.get<GroupParams, never, GroupDTO | null>(
    `${config.apiEndpoint}/api/groups/:id`,
    ({ params }) => {
      const group = data.groups.find((group) => group.id === params.id);
      if (!group) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      return HttpResponse.json(group);
    }
  ),
  http.put<GroupParams, GroupPayloadDTO, GroupDTO>(
    `${config.apiEndpoint}/api/groups/:id`,
    async ({ params, request }) => {
      const group = data.groups.find((group) => group.id === params.id);
      if (!group) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const payload = await request.json();
      const updated: GroupDTO = {
        ...group,
        title: payload.title,
        description: payload.description
      };
      data.groups.splice(data.groups.indexOf(group), 1, updated);

      return HttpResponse.json(updated);
    }
  ),
  http.delete<GroupParams, never, never>(
    `${config.apiEndpoint}/api/groups/:id`,
    ({ params }) => {
      const group = data.groups.find((group) => group.id === params.id);
      if (!group) {
        throw new HttpResponse(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const hasCampaign = data.campaigns.some(
        (campaign) => campaign.groupId === group.id
      );
      if (hasCampaign) {
        group.archivedAt = new Date().toJSON();
      } else {
        data.groups = data.groups.filter((group) => group.id !== params.id);
        data.groupHousings.delete(params.id);
      }

      return new HttpResponse(null, {
        status: constants.HTTP_STATUS_NO_CONTENT
      });
    }
  )
];
