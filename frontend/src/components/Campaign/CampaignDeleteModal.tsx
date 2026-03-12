import { createPortal } from 'react-dom';

import {
  createConfirmationModal,
  type ConfirmationModalOptions,
  type ConfirmationModalProps
} from '~/components/modals/ConfirmationModal/ConfirmationModalNext';

export type CreateCampaignDeleteModalOptions = Partial<ConfirmationModalOptions>;

export type CampaignDeleteModalProps = Omit<
  ConfirmationModalProps,
  'title' | 'children'
>;

export function createCampaignDeleteModal(
  options?: Readonly<CreateCampaignDeleteModalOptions>
) {
  const modal = createConfirmationModal({
    id: options?.id ?? 'campaign-delete-modal',
    isOpenedByDefault: options?.isOpenedByDefault ?? false
  });

  return {
    ...modal,
    Component(props?: Readonly<CampaignDeleteModalProps>) {
      const component = (
        <modal.Component {...props} title="Supprimer la campagne">
          Êtes-vous sûr de vouloir supprimer cette campagne ?
        </modal.Component>
      );

      return createPortal(component, document.body);
    }
  };
}

export default createCampaignDeleteModal;
