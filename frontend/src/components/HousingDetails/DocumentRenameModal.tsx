import {
  createConfirmationModal,
  type ConfirmationModalProps
} from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import DocumentPreview from '~/components/FileUpload/DocumentPreview';
import type { DocumentDTO } from '@zerologementvacant/models';
import Stack from '@mui/material/Stack';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import { FormProvider, useForm, useFormState } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers-next/yup';
import { object, string, type InferType } from 'yup-next';
import Box from '@mui/material/Box';

const schema = object({
  filename: string()
    .required('Le nom du document est requis')
    .trim()
    .max(255, 'Le nom du document doit faire moins de 255 caractères')
});

type FormSchema = InferType<typeof schema>;

export type DocumentRenameModalProps = Pick<
  ConfirmationModalProps,
  'className' | 'size'
> & {
  document: DocumentDTO | null;
  onCancel(): void;
  onSubmit(filename: string): void;
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
        props.onCancel();
      }

      function onOpen(): void {
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
              onOpen={onOpen}
              onSubmit={form.handleSubmit(onSubmit)}
            >
              {document ? (
                <Stack spacing="1rem" useFlexGap>
                  <Box sx={{ maxWidth: '12rem' }}>
                    <DocumentPreview document={document} />
                  </Box>
                  <AppTextInputNext
                    name="filename"
                    label="Nouveau nom du document"
                    hintText="Le nom du document doit faire moins de 255 caractères."
                  />
                </Stack>
              ) : null}
            </modal.Component>
          </FormProvider>
        </form>
      );
    }
  };
}
