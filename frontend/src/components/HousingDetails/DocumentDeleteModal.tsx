import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';

import {
  createConfirmationModal,
  type ConfirmationModalProps
} from '~/components/modals/ConfirmationModal/ConfirmationModalNext';

export type DocumentDeleteModalProps = Pick<
  ConfirmationModalProps,
  'className' | 'size'
> & {
  document: DocumentDTO | null;
  onCancel(): void;
  onSubmit(): void;
};

export function createDocumentDeleteModal() {
  const modal = createConfirmationModal({
    id: 'document-delete-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: DocumentDeleteModalProps) {
      const { document, ...rest } = props;

      return (
        <modal.Component
          {...rest}
          title="Suppression du document"
          onClose={props.onCancel}
          onSubmit={props.onSubmit}
        >
          {document ? (
            <Typography>
              Êtes-vous sûr de vouloir supprimer ce document ?
            </Typography>
          ) : null}
        </modal.Component>
      );
    }
  };
}
