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
> &
  Pick<PrecisionTabs, 'tab' | 'onTabChange'> & {
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
      const { tab, options, value, onSubmit, onTabChange, ...rest } = props;
      const [internalValue, setInternalValue] = useState<Precision[]>(value);

      return (
        <confirmationModal.Component
          {...rest}
          title="Précisez la situation du logement"
          size="extra-large"
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
