import { zlvApi } from './api.service';
import { DraftDTO } from '../../../shared/models/DraftDTO';
import { Draft } from '../models/Draft';
import { getURLQuery } from '../utils/fetchUtils';

function parseDraft(draft: DraftDTO): Draft {
  return {
    id: draft.id,
    body: draft.body ?? undefined,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

export interface FindOptions {
  campaign?: string;
}

export const draftApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findDrafts: builder.query<Draft[], FindOptions | void>({
      query(opts) {
        const query = getURLQuery({
          campaign: opts?.campaign,
        });
        return `/drafts${query}`;
      },
      transformResponse: (drafts: DraftDTO[]) => drafts.map(parseDraft),
      providesTags(drafts) {
        return [
          ...(drafts ?? []).map((draft) => ({
            type: 'Draft' as const,
            id: draft.id,
          })),
          { type: 'Draft', id: 'LIST' },
        ];
      },
    }),
  }),
});

export const { useFindDraftsQuery } = draftApi;
