import { useIsModalOpen } from '@codegouvfr/react-dsfr/Modal/useIsModalOpen';

import type { Precision } from '@zerologementvacant/models';
import { useState } from 'react';
import {
  type ConfirmationModalProps,
  createConfirmationModal
} from '../modals/ConfirmationModal/ConfirmationModalNext';
import PrecisionTabs from './PrecisionTabs';

export type PrecisionModalProps = Omit<
  ConfirmationModalProps,
  'children' | 'size' | 'title' | 'onSubmit'
> &
  Pick<PrecisionTabs, 'tab' | 'onTabChange'> & {
    options: Precision[];
    value: Precision[];
    onSubmit(value: Precision[]): void;
  };

function createPrecisionModalNext(id: string) {
  const precisionModalOptions = {
    id: `precision-modal-${id}`,
    isOpenedByDefault: false
  };
  const confirmationModal = createConfirmationModal(precisionModalOptions);

  return {
    ...confirmationModal,
    Component(props: PrecisionModalProps) {
      const { tab, options, value, onSubmit, onTabChange, ...rest } = props;
      const [internalValue, setInternalValue] = useState<Precision[]>([]);

      useIsModalOpen(precisionModalOptions, {
        onDisclose() {
          setInternalValue(value);
        }
      });

      return (
        <confirmationModal.Component
          {...rest}
          title="Précisez la situation du logement"
          size="extra-extra-large"
          onSubmit={() => {
            onSubmit(internalValue);
          }}
        >
          <PrecisionTabs
            tab={tab}
            options={options}
            value={internalValue}
            onChange={setInternalValue}
            onTabChange={onTabChange}
          />
        </confirmationModal.Component>
      );
    }
  };
}

export default createPrecisionModalNext;
