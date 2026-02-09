import Typography from '@mui/material/Typography';

import {
  createConfirmationModal,
  type ConfirmationModalProps
} from '~/components/modals/ConfirmationModal/ConfirmationModalNext';

export type DocumentDeleteModalProps = Pick<
  ConfirmationModalProps,
  'className' | 'size'
> & {
  onCancel(): void;
  onSubmit(): void;
};

export function createDocumentDeleteModal(id: string) {
  const modal = createConfirmationModal({
    id: `document-delete-modal-${id}`,
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: Readonly<DocumentDeleteModalProps>) {
      return (
        <modal.Component
          {...props}
          title="Suppression du document"
          onClose={props.onCancel}
          onSubmit={props.onSubmit}
        >
          <Typography>
            Êtes-vous sûr de vouloir supprimer ce document ?
          </Typography>
        </modal.Component>
      );
    }
  };
}
