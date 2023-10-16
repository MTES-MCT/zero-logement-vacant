import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import { pluralize } from '../../utils/stringUtils';
import { Text } from '../_dsfr';

interface Props {
  housingCount: number;
  onSubmit: () => void;
}

function GroupRemoveHousingModal(props: Props) {
  const title = `Supprimer ${props.housingCount} ${pluralize(
    props.housingCount
  )('logement')} de ce groupe`;

  return (
    <ConfirmationModal
      modalId="group-remove-housing-modal"
      openingButtonProps={{
        children: 'Supprimer du groupe',
        iconId: 'ri-close-line',
        priority: 'secondary',
      }}
      size="large"
      title={title}
      onSubmit={props.onSubmit}
    >
      <Text>
        Êtes-vous sûr de vouloir supprimer ces logements de ce groupe ? Vous
        pourrez toujours retrouver ces logements dans votre parc de logements.
      </Text>
    </ConfirmationModal>
  );
}

export default GroupRemoveHousingModal;
