import { useState } from 'react';

import { Precision } from '@zerologementvacant/models';
import {
  ConfirmationModalProps,
  createConfirmationModal
} from '../modals/ConfirmationModal/ConfirmationModalNext';
import PrecisionTabs from './PrecisionTabs';

export type PrecisionModalProps = Omit<
  ConfirmationModalProps,
  'children' | 'size' | 'title' | 'onSubmit'
> & {
  options: Precision[];
  value: Precision[];
  onSubmit(value: Precision[]): void;
};

function createPrecisionModalNext() {
  const confirmationModal = createConfirmationModal({
    id: 'precision-modal',
    isOpenedByDefault: false
  });

  return {
    ...confirmationModal,
    Component(props: PrecisionModalProps) {
      const { options, value, onSubmit, ...rest } = props;
      const [internalValue, setInternalValue] = useState<Precision[]>(value);

      return (
        <confirmationModal.Component
          {...rest}
          title="Précisez la situation du logement"
          size="large"
          onSubmit={() => {
            onSubmit(internalValue);
          }}
        >
          <PrecisionTabs
            options={options}
            value={internalValue}
            onChange={setInternalValue}
          />
        </confirmationModal.Component>
      );
    }
  };
}

export default createPrecisionModalNext;
