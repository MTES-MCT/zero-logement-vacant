import fp from 'lodash/fp';

import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftUpdatePayloadDTO,
  SenderPayloadDTO
} from '@zerologementvacant/models';
import { zlvApi } from './api.service';
import {
  Draft,
  DraftCreationPayload,
  DraftUpdatePayload
} from '../models/Draft';
import { getURLQuery } from '../utils/fetchUtils';
import { SenderPayload } from '../models/Sender';

export interface FindOptions {
  campaign?: string;
}

export const draftApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findDrafts: builder.query<Draft[], FindOptions | void>({
      query(opts) {
        const query = getURLQuery({
          campaign: opts?.campaign
        });
        return `/drafts${query}`;
      },
      transformResponse: (drafts: DraftDTO[]) => drafts.map(fromDraftDTO),
      providesTags(drafts) {
        return [
          ...(drafts ?? []).map((draft) => ({
            type: 'Draft' as const,
            id: draft.id
          })),
          { type: 'Draft', id: 'LIST' }
        ];
      }
    }),
    createDraft: builder.mutation<void, DraftCreationPayload>({
      query: (draft) => ({
        url: '/drafts',
        method: 'POST',
        body: toDraftCreationPayloadDTO(draft)
      }),
      invalidatesTags: [{ type: 'Draft', id: 'LIST' }]
    }),
    updateDraft: builder.mutation<void, DraftUpdatePayload>({
      query: (draft) => ({
        url: `/drafts/${draft.id}`,
        method: 'PUT',
        body: toDraftUpdatePayloadDTO(draft)
      }),
      invalidatesTags: (result, error, draft) => [
        { type: 'Draft', id: draft.id }
      ]
    })
  })
});

function fromDraftDTO(draft: DraftDTO): Draft {
  return {
    id: draft.id,
    subject: draft.subject,
    body: draft.body?.replaceAll('<br />', '\n') ?? '',
    logo: draft.logo,
    sender: draft.sender,
    writtenAt: draft.writtenAt,
    writtenFrom: draft.writtenFrom,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt
  };
}

function toDraftCreationPayloadDTO(
  draft: DraftCreationPayload
): DraftCreationPayloadDTO {
  return {
    ...emptyToNull({
      subject: draft.subject,
      body: draft.body,
      logo: draft.logo,
      writtenAt: draft.writtenAt,
      writtenFrom: draft.writtenFrom
    }),
    campaign: draft.campaign,
    sender: toSenderPayloadDTO(draft.sender)
  };
}

function toDraftUpdatePayloadDTO(
  draft: DraftUpdatePayload
): DraftUpdatePayloadDTO {
  return {
    ...emptyToNull({
      subject: draft.subject,
      body: draft.body,
      writtenAt: draft.writtenAt,
      writtenFrom: draft.writtenFrom
    }),
    id: draft.id,
    logo: draft.logo,
    sender: toSenderPayloadDTO(draft.sender)
  };
}

function toSenderPayloadDTO(sender: SenderPayload): SenderPayloadDTO {
  return emptyToNull(sender);
}

function emptyToNull<T extends object>(obj: T): T {
  // @ts-expect-error: lodash/fp’s types are awful
  return fp.mapValues((value) => (fp.isEmpty(value) ? null : value), obj);
}

export const {
  useFindDraftsQuery,
  useCreateDraftMutation,
  useUpdateDraftMutation
} = draftApi;
