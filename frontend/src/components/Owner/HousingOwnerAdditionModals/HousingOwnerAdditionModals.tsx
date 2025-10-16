import Button, { type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import type { MarkOptional } from 'ts-essentials';

import createOwnerSearchModal from '~/components/Owner/HousingOwnerAdditionModals/OwnerSearchModal';
import type { Owner } from '~/models/Owner';
import createOwnerAttachmentModal from './OwnerAttachmentModal';
import { useState } from 'react';

type ReducedButtonProps = MarkOptional<
  ButtonProps.Common & ButtonProps.WithIcon & ButtonProps.AsButton,
  'children' | 'iconId' | 'priority'
>;

export type HousingOwnerAdditionModalsProps = {
  address: string;
  buttonProps?: ReducedButtonProps;
  exclude: ReadonlyArray<Owner>
  onOwnerAddition(owner: Owner): void;
};

const ownerSearchModal = createOwnerSearchModal();
const ownerAttachmentModal = createOwnerAttachmentModal();

function HousingOwnerAdditionModals(props: HousingOwnerAdditionModalsProps) {
  const [owner, setOwner] = useState<Owner | null>(null);

  function onSelectOwner(selected: Owner): void {
    setOwner(selected);
    ownerSearchModal.close();
    ownerAttachmentModal.open();
  }

  function onBack(): void {
    setOwner(null);
    ownerAttachmentModal.close();
    ownerSearchModal.open();
  }

  function onConfirm(): void {
    if (owner) {
      props.onOwnerAddition(owner);
    }
    setOwner(null);
    ownerAttachmentModal.close();
  }

  return (
    <>
      <Button
        iconId="fr-icon-add-line"
        priority="secondary"
        {...props.buttonProps}
        onClick={ownerSearchModal.open}
      >
        Ajouter un propriétaire
      </Button>

      <ownerSearchModal.Component
        address={props.address}
        exclude={props.exclude}
        onSelect={onSelectOwner}
      />
      <ownerAttachmentModal.Component
        address={props.address}
        owner={owner}
        onBack={onBack}
        onConfirm={onConfirm}
      />
    </>
  );
}

export default HousingOwnerAdditionModals;
