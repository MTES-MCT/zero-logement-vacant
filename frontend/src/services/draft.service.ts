import { zlvApi } from './api.service';
import { DraftDTO, DraftPayloadDTO } from '../../../shared/models/DraftDTO';
import { Draft } from '../models/Draft';
import { getURLQuery } from '../utils/fetchUtils';

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
      transformResponse: (drafts: DraftDTO[]) => drafts.map(fromDraftDTO),
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
    updateDraft: builder.mutation<void, Draft>({
      query: (draft) => ({
        url: `/drafts/${draft.id}`,
        method: 'PUT',
        body: toDraftPayloadDTO(draft),
      }),
      invalidatesTags: (result, error, draft) => [
        { type: 'Draft', id: draft.id },
      ],
    }),
  }),
});

function fromDraftDTO(draft: DraftDTO): Draft {
  return {
    id: draft.id,
    body: draft.body ?? undefined,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

function toDraftPayloadDTO(draft: Draft): DraftPayloadDTO {
  return {
    body: draft.body ?? null,
  };
}

export const { useFindDraftsQuery, useUpdateDraftMutation } = draftApi;
