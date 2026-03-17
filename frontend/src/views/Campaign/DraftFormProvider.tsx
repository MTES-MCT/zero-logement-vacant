import type { FileUploadDTO } from '@zerologementvacant/models';
import { isEqual } from 'lodash-es';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';
import * as yup from 'yup';

import { senderSchema } from '~/components/Draft/DraftSender';
import { writtenSchema } from '~/components/Draft/DraftMailInfo';
import { useCampaign } from '~/hooks/useCampaign';
import { useForm } from '~/hooks/useForm';
import useUnsavedChanges from '~/hooks/useUnsavedChanges';
import type { DraftCreationPayload, DraftUpdatePayload } from '~/models/Draft';
import type { SenderPayload, SignatoriesPayload } from '~/models/Sender';
import {
  useCreateDraftMutation,
  useUpdateDraftMutation
} from '~/services/draft.service';

const schema = yup
  .object({
    subject: yup.string().default(undefined),
    body: yup.string().default(undefined),
    sender: senderSchema
  })
  .concat(writtenSchema)
  .required();

interface DraftFormValues extends Omit<DraftCreationPayload, 'campaign'> {}

interface ContextType {
  values: DraftFormValues;
  setValues: (values: DraftFormValues) => void;
  setBody: (body: { subject?: string; body?: string }) => void;
  setLogo: (logo: FileUploadDTO[]) => void;
  setSender: (sender: SenderPayload) => void;
  setSignatories: (signatories: SignatoriesPayload | null) => void;
  setWritten: (written: { at: string; from: string }) => void;
  form: ReturnType<typeof useForm>;
  save: () => Promise<void>;
  isSaving: boolean;
  isError: boolean;
  isSuccess: boolean;
  exists: boolean;
}

const DraftFormContext = createContext<ContextType | null>(null);

interface Props extends PropsWithChildren {
  campaignId: string;
}

function DraftFormProvider(props: Readonly<Props>) {
  const { draft, isLoadingDraft } = useCampaign();

  const [values, setValues] = useState<DraftFormValues>({
    subject: '',
    body: '',
    logo: [],
    sender: {
      name: '',
      service: '',
      firstName: '',
      lastName: '',
      address: '',
      email: '',
      phone: '',
      signatories: [null, null]
    },
    writtenAt: '',
    writtenFrom: ''
  });

  useEffect(() => {
    if (draft) {
      setValues({
        subject: draft.subject ?? '',
        body: draft.body ?? '',
        logo: draft.logo ?? [],
        sender: {
          name: draft.sender?.name ?? '',
          service: draft.sender?.service ?? '',
          firstName: draft.sender?.firstName ?? '',
          lastName: draft.sender?.lastName ?? '',
          address: draft.sender?.address ?? '',
          email: draft.sender?.email ?? '',
          phone: draft.sender?.phone ?? '',
          signatories: draft.sender.signatories ?? null
        },
        writtenAt: draft.writtenAt ?? '',
        writtenFrom: draft.writtenFrom ?? ''
      });
    }
  }, [draft]);

  const form = useForm(schema as any, {
    subject: values.subject,
    body: values.body,
    sender: values.sender,
    writtenAt: values.writtenAt,
    writtenFrom: values.writtenFrom
  });

  const hasChanges = form.isDirty && !!draft && !isEqual(draft, values);
  useUnsavedChanges({ when: hasChanges });

  const [createDraft, createDraftMutation] = useCreateDraftMutation();
  const [updateDraft, updateDraftMutation] = useUpdateDraftMutation();

  const exists = !!draft;

  const save = useCallback(async (): Promise<void> => {
    if (exists) {
      await updateDraft({ ...values, id: draft!.id } as DraftUpdatePayload).unwrap();
    } else {
      await createDraft({ ...values, campaign: props.campaignId }).unwrap();
    }
  }, [exists, draft, values, props.campaignId, createDraft, updateDraft]);

  const mutation = exists ? updateDraftMutation : createDraftMutation;

  function setBody(body: { subject?: string; body?: string }): void {
    setValues({ ...values, ...body });
  }

  function setLogo(logo: FileUploadDTO[]): void {
    setValues({ ...values, logo });
  }

  function setSender(sender: SenderPayload): void {
    setValues({ ...values, sender });
  }

  function setSignatories(signatories: SignatoriesPayload | null): void {
    setSender({ ...values.sender, signatories });
  }

  function setWritten(written: { at: string; from: string }): void {
    setValues({
      ...values,
      writtenAt: written.at,
      writtenFrom: written.from
    });
  }

  if (isLoadingDraft) {
    return null;
  }

  const contextValue: ContextType = {
    values,
    setValues,
    setBody,
    setLogo,
    setSender,
    setSignatories,
    setWritten,
    form,
    save,
    isSaving: mutation.isLoading,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    exists
  };

  return (
    <DraftFormContext.Provider value={contextValue}>
      {props.children}
    </DraftFormContext.Provider>
  );
}

export function useDraftForm() {
  const context = useContext(DraftFormContext);
  if (!context) {
    throw new Error('useDraftForm must be used within a DraftFormProvider');
  }
  return context;
}

export default DraftFormProvider;
