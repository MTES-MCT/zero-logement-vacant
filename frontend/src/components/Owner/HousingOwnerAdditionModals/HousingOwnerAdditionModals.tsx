import Button, { type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import type { MarkOptional } from 'ts-essentials';

import createOwnerSearchModal from '~/components/Owner/HousingOwnerAdditionModals/OwnerSearchModal';
import type { Owner } from '~/models/Owner';

type ReducedButtonProps = MarkOptional<
  ButtonProps.Common & ButtonProps.WithIcon & ButtonProps.AsButton,
  'children' | 'iconId' | 'priority'
>;

export type HousingOwnerAdditionModalsProps = {
  buttonProps?: ReducedButtonProps;
  onOwnerSelect(owner: Owner): void;
};

const ownerSearchModal = createOwnerSearchModal();

function HousingOwnerAdditionModals(props: HousingOwnerAdditionModalsProps) {
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

      <ownerSearchModal.Component onSelect={props.onOwnerSelect} />
    </>
  );
}

export default HousingOwnerAdditionModals;
