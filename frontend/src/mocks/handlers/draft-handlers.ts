import { http, HttpResponse, RequestHandler } from 'msw';

import { DraftDTO } from '@zerologementvacant/models';
import { isDefined } from '@zerologementvacant/utils';
import data from './data';
import config from '../../utils/config';

export const draftHandlers: RequestHandler[] = [
  http.get<Record<string, never>, never, DraftDTO[]>(
    `${config.apiEndpoint}/api/drafts`,
    ({ request }) => {
      const url = new URL(request.url);
      const campaignId = url.searchParams.get('campaign');

      const drafts: DraftDTO[] = [...data.campaignDrafts.values()]
        .filter((campaignDraft) => campaignDraft.campaignId === campaignId)
        .map((campaignDraft) => {
          return data.drafts.find(
            (draft) => draft.id === campaignDraft.draftId
          );
        })
        .filter(isDefined);

      // TODO
      return HttpResponse.json(drafts);
    }
  )
];
