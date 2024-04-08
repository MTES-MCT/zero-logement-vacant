import { zlvApi } from './api.service';
import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftUpdatePayloadDTO,
} from '../../../shared/models/DraftDTO';
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
    createDraft: builder.mutation<void, DraftCreationPayloadDTO>({
      query: (draft) => ({
        url: '/drafts',
        method: 'POST',
        body: draft,
      }),
      invalidatesTags: [{ type: 'Draft', id: 'LIST' }],
    }),
    updateDraft: builder.mutation<void, DraftUpdatePayloadDTO>({
      query: (draft) => ({
        url: `/drafts/${draft.id}`,
        method: 'PUT',
        body: draft,
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
    body: draft.body.replaceAll('<br />', '\n'),
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

export const {
  useFindDraftsQuery,
  useCreateDraftMutation,
  useUpdateDraftMutation,
} = draftApi;
