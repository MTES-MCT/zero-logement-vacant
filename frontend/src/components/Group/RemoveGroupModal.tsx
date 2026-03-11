import { createPortal } from 'react-dom';

import {
  createConfirmationModal,
  type ConfirmationModalOptions,
  type ConfirmationModalProps
} from '~/components/modals/ConfirmationModal/ConfirmationModalNext';

export type CreateRemoveGroupModalOptions = Partial<ConfirmationModalOptions>;

export type CreateRemoveGroupModalProps = Omit<
  ConfirmationModalProps,
  'title' | 'children'
>;

export function createRemoveGroupModal(
  props?: Readonly<CreateRemoveGroupModalOptions>
) {
  const modal = createConfirmationModal({
    id: props?.id ?? 'remove-group-modal',
    isOpenedByDefault: props?.isOpenedByDefault ?? false
  });

  return {
    ...modal,
    Component(props?: Readonly<CreateRemoveGroupModalProps>) {
      const component = (
        <modal.Component {...props} title="Supprimer le groupe">
          Êtes-vous sûr de vouloir supprimer ce groupe ?
        </modal.Component>
      );

      return createPortal(component, document.body);
    }
  };
}

export default createRemoveGroupModal;
