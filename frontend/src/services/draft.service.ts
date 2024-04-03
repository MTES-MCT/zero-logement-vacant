import { zlvApi } from './api.service';
import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftUpdatePayloadDTO,
} from '../../../shared/models/DraftDTO';
import {
  Draft,
  DraftCreationPayload,
  DraftUpdatePayload,
} from '../models/Draft';
import { getURLQuery } from '../utils/fetchUtils';
import { SenderPayload } from '../models/Sender';
import { SenderPayloadDTO } from '../../../shared';

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
    createDraft: builder.mutation<void, DraftCreationPayload>({
      query: (draft) => ({
        url: '/drafts',
        method: 'POST',
        body: toDraftCreationPayloadDTO(draft),
      }),
      invalidatesTags: [{ type: 'Draft', id: 'LIST' }],
    }),
    updateDraft: builder.mutation<void, DraftUpdatePayload>({
      query: (draft) => ({
        url: `/drafts/${draft.id}`,
        method: 'PUT',
        body: toDraftUpdatePayloadDTO(draft),
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
    sender: draft.sender ?? undefined,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

function toDraftCreationPayloadDTO(
  draft: DraftCreationPayload
): DraftCreationPayloadDTO {
  return {
    body: draft.body.replaceAll('\n', '<br />'),
    campaign: draft.campaign,
    sender: toSenderPayloadDTO(draft.sender),
  };
}

function toDraftUpdatePayloadDTO(
  draft: DraftUpdatePayload
): DraftUpdatePayloadDTO {
  return {
    id: draft.id,
    body: draft.body.replaceAll('\n', '<br />'),
    sender: toSenderPayloadDTO(draft.sender),
  };
}

function toSenderPayloadDTO(sender: SenderPayload): SenderPayloadDTO {
  return {
    name: sender.name,
    service: sender.service,
    firstName: sender.firstName,
    lastName: sender.lastName,
    address: sender.address,
    signatoryLastName: sender.signatoryLastName,
    signatoryFirstName: sender.signatoryFirstName,
    signatoryRole: sender.signatoryRole,
    signatoryFile: sender.signatoryFile,
    // Catch empty strings
    email: sender.email || null,
    phone: sender.phone || null,
  };
}

export const {
  useFindDraftsQuery,
  useCreateDraftMutation,
  useUpdateDraftMutation,
} = draftApi;
