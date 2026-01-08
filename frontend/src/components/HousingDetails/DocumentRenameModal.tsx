import { yupResolver } from '@hookform/resolvers/yup';
import type { DocumentDTO } from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
import { FormProvider, useForm, useFormState } from 'react-hook-form';
import { type InferType } from 'yup';

import {
  createConfirmationModal,
  type ConfirmationModalProps
} from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';

const schema = schemas.documentPayload;

type FormSchema = InferType<typeof schema>;

export type DocumentRenameModalProps = Pick<
  ConfirmationModalProps,
  'className' | 'size'
> & {
  document: DocumentDTO | null;
  onCancel(): void;
  onSubmit(filename: string): void;
  onDownload(): void;
};

export function createDocumentRenameModal() {
  const modal = createConfirmationModal({
    id: 'document-rename-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: DocumentRenameModalProps) {
      const { document, ...rest } = props;

      const form = useForm({
        values: {
          filename: document?.filename ?? ''
        },
        mode: 'onSubmit',
        resolver: yupResolver(schema)
      });

      function onClose(): void {
        form.reset();
      }

      const { isDirty } = useFormState({ control: form.control });
      function onSubmit(payload: FormSchema): void {
        if (isDirty) {
          props.onSubmit(payload.filename);
        }
      }

      return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormProvider {...form}>
            <modal.Component
              {...rest}
              title="Renommer le document"
              onClose={onClose}
              onSubmit={form.handleSubmit(onSubmit)}
            >
              {document ? (
                <AppTextInputNext
                  name="filename"
                  label="Nouveau nom du document"
                  hintText="Le nom du document doit faire moins de 255 caractères."
                />
              ) : null}
            </modal.Component>
          </FormProvider>
        </form>
      );
    }
  };
}
