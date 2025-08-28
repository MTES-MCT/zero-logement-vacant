import { yupResolver } from '@hookform/resolvers/yup';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import { GeoPerimeter } from '../../../models/GeoPerimeter';
import { createConfirmationModal } from '../ConfirmationModal/ConfirmationModalNext';

export interface PerimeterEditionPayload {
  name: string;
  kind: string;
}

export type PerimeterEditionModalProps = {
  perimeter: GeoPerimeter | null;
  onClose(): void;
  onSubmit(payload: PerimeterEditionPayload): void;
};

const schema = yup.object({
  name: yup.string().trim().required('Veuillez saisir le nom du périmètre'),
  kind: yup.string().trim().required('Veuillez saisir le nom du filtre')
});

function createPerimeterEditionModal() {
  const modal = createConfirmationModal({
    id: 'perimeter-edition-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: PerimeterEditionModalProps) {
      const form = useForm({
        values: {
          name: props.perimeter?.name ?? '',
          kind: props.perimeter?.kind ?? ''
        },
        resolver: yupResolver(schema),
        mode: 'onSubmit'
      });

      function submit(payload: PerimeterEditionPayload): void {
        props.onSubmit(payload);
      }

      return (
        <modal.Component
          size="large"
          onClose={props.onClose}
          onSubmit={form.handleSubmit(submit)}
          title="Édition du périmètre"
        >
          <FormProvider {...form}>
            <AppTextInputNext
              name="name"
              label="Nom du périmètre (obligatoire)"
            />
            <AppTextInputNext name="kind" label="Nom du filtre (obligatoire)" />
          </FormProvider>
        </modal.Component>
      );
    }
  };
}

export default createPerimeterEditionModal;
