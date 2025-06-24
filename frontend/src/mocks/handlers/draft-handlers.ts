import { faker } from '@faker-js/faker/locale/fr';

import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftUpdatePayloadDTO
} from '@zerologementvacant/models';
import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';
import { isDefined } from '../../utils/compareUtils';
import config from '../../utils/config';
import data from './data';

interface DraftParams {
  id: string;
}

export const draftHandlers: RequestHandler[] = [
  http.get<Record<string, never>, never, DraftDTO[]>(
    `${config.apiEndpoint}/api/drafts`,
    ({ request }) => {
      const url = new URL(request.url);
      const campaignId = url.searchParams.get('campaign');
      if (!campaignId) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_BAD_REQUEST
        });
      }

      const drafts =
        data.campaignDrafts
          .get(campaignId)
          ?.map(({ id }) => data.drafts.find((draft) => draft.id === id))
          ?.filter(isDefined) ?? [];
      return HttpResponse.json(drafts);
    }
  ),
  http.post<Record<string, never>, DraftCreationPayloadDTO, DraftDTO>(
    `${config.apiEndpoint}/api/drafts`,
    async ({ request }) => {
      const payload = await request.json();

      const draft: DraftDTO = {
        id: faker.string.uuid(),
        subject: payload.subject,
        body: payload.body,
        sender: {
          id: faker.string.uuid(),
          name: payload.sender?.name ?? null,
          firstName: payload.sender?.firstName ?? null,
          lastName: payload.sender?.lastName ?? null,
          email: payload.sender?.email ?? null,
          phone: payload.sender?.phone ?? null,
          address: payload.sender?.address ?? null,
          service: payload.sender?.service ?? null,
          signatories: payload.sender?.signatories ?? null,
          createdAt: new Date().toJSON(),
          updatedAt: new Date().toJSON()
        },
        logo: payload.logo,
        writtenAt: payload.writtenAt,
        writtenFrom: payload.writtenFrom,
        createdAt: new Date().toJSON(),
        updatedAt: new Date().toJSON()
      };
      data.drafts.push(draft);

      return HttpResponse.json(draft, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),
  http.put<DraftParams, DraftUpdatePayloadDTO, DraftDTO>(
    `${config.apiEndpoint}/api/drafts/:id`,
    async ({ params, request }) => {
      const draft = data.drafts.find((draft) => draft.id === params.id);
      if (!draft) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const payload = await request.json();
      draft.subject = payload.subject;
      draft.body = payload.body;
      draft.sender = {
        ...payload.sender,
        id: draft.sender.id,
        createdAt: draft.sender.createdAt,
        updatedAt: new Date().toJSON()
      };
      draft.logo = payload.logo;
      draft.writtenAt = payload.writtenAt;
      draft.writtenFrom = payload.writtenFrom;
      draft.updatedAt = new Date().toJSON();

      return HttpResponse.json(draft);
    }
  )
];
