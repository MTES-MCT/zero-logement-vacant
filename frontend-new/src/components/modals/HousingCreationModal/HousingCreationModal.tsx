import { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';

import ModalGraphStepper, { Step } from '../ModalStepper/ModalGraphStepper';
import fillLocalId from './FillLocalId';
import reviewHousing from './ReviewHousing';

interface Props {
  onFinish?: () => void;
}

const modal = createModal({
  id: 'housing-creation-modal',
  isOpenedByDefault: false,
});

function HousingCreationModal(props: Props) {
  const openingButtonProps: ButtonProps = {
    iconId: 'fr-icon-add-line',
    size: 'small',
    children: 'Ajouter un logement',
    onClick: modal.open,
  };

  const steps: Step[] = [fillLocalId, reviewHousing];

  return (
    <ModalGraphStepper
      openingButtonProps={openingButtonProps}
      size="large"
      steps={steps}
      title="Ajouter un logement"
      onFinish={props.onFinish}
    />
  );
}

export default HousingCreationModal;
