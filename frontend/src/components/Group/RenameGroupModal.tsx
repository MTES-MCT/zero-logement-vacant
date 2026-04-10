import { yupResolver } from '@hookform/resolvers/yup';
import { createPortal } from 'react-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { object, string, type InferType } from 'yup';

import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import {
  createConfirmationModal,
  type ConfirmationModalOptions,
  type ConfirmationModalProps
} from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import type { Group } from '~/models/Group';
import type { GroupPayload } from '~/models/GroupPayload';

export type RenameGroupModalOptions = Partial<ConfirmationModalOptions>;

export type RenameGroupModalProps = Omit<
  ConfirmationModalProps,
  'title' | 'children' | 'onSubmit'
> & {
  group: Group;
  onSubmit(payload: Pick<GroupPayload, 'title' | 'description'>): void;
};

const schema = object({
  title: string().trim().required('Veuillez renseigner un nom'),
  description: string().trim().default('')
});

type FormSchema = InferType<typeof schema>;

export function createRenameGroupModal(options?: Readonly<RenameGroupModalOptions>) {
  const modal = createConfirmationModal({
    id: options?.id ?? 'rename-group-modal',
    isOpenedByDefault: options?.isOpenedByDefault ?? false
  });

  return {
    ...modal,
    Component(props: Readonly<RenameGroupModalProps>) {
      const { group, onSubmit, ...rest } = props;

      const form = useForm<FormSchema>({
        resolver: yupResolver(schema),
        values: {
          title: group.title,
          description: group.description ?? ''
        },
        mode: 'onSubmit'
      });

      const handleSubmit: SubmitHandler<FormSchema> = (data) => {
        onSubmit({ title: data.title, description: data.description });
      };

      const component = (
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <modal.Component
            size="large"
            {...rest}
            title="Modifier le groupe"
            onOpen={() => form.reset()}
          >
            <AppTextInputNext<FormSchema>
              label="Nom du groupe (obligatoire)"
              name="title"
              control={form.control}
            />
            <AppTextInputNext<FormSchema>
              label="Description"
              name="description"
              control={form.control}
              textArea
            />
          </modal.Component>
        </form>
      );

      return createPortal(component, document.body);
    }
  };
}
