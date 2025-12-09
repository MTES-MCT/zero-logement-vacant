import { createModal, type ModalProps } from '@codegouvfr/react-dsfr/Modal';
import { useIsModalOpen } from '@codegouvfr/react-dsfr/Modal/useIsModalOpen';
import { type JSX, useEffect } from 'react';
import { match } from 'ts-pattern';

export interface ExtendedModalOptions {
  id: string;
  isOpenedByDefault: boolean;
}

export interface ExtendedModalProps extends Omit<ModalProps, 'size'> {
  size?: ModalProps['size'] | SizeExtension;
  onOpen?(): void;
  onClose?(): void;
}

export function createExtendedModal(options: ExtendedModalOptions) {
  const modal = createModal(options);

  return {
    ...modal,
    Component(props: ExtendedModalProps): JSX.Element {
      const { size, onOpen, onClose, ...rest } = props;

      useIsModalOpen(options, {
        onDisclose: onOpen,
        onConceal: onClose
      });

      useEffect(() => {
        if (isSizeExtension(size)) {
          const container = document
            .getElementById(options.id)
            ?.querySelector('.fr-col-12');
          container?.classList?.remove('fr-col-md-10', 'fr-col-lg-8');
          match(size)
            .with('extra-large', () => {
              container?.classList?.add('fr-col-lg-10');
            })
            .with('extra-extra-large', () => {
              // Keep as-is i.e. ".fr-col-12"
            })
            .exhaustive();
        }
      }, [size]);

      return (
        <modal.Component
          {...rest}
          size={isSizeExtension(size) ? 'large' : size}
        />
      );
    }
  };
}

const SIZE_EXTENSION_VALUES = ['extra-large', 'extra-extra-large'] as const;
type SizeExtension = (typeof SIZE_EXTENSION_VALUES)[number];

function isSizeExtension(
  size: ExtendedModalProps['size']
): size is SizeExtension {
  return size ? SIZE_EXTENSION_VALUES.includes(size as SizeExtension) : false;
}

export type Modal = ReturnType<typeof createExtendedModal>;
