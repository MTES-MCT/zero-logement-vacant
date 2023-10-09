import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';
import { pluralize } from '../../utils/stringUtils';
import { Text } from '@dataesr/react-dsfr';

interface Props {
  open: boolean;
  housingCount: number;
  onSubmit: () => void;
  onClose: () => void;
}

function GroupRemoveHousingModal(props: Props) {
  const title = `Supprimer ${props.housingCount} ${pluralize(
    props.housingCount
  )('logement')} de ce groupe`;

  if (!props.open) {
    return <></>;
  }

  return (
    <ConfirmationModal
      alignFooter="right"
      icon=""
      size="lg"
      title={title}
      onSubmit={props.onSubmit}
      onClose={props.onClose}
    >
      <Text>
        Êtes-vous sûr de vouloir supprimer ces logements de ce groupe ? Vous
        pourrez toujours retrouver ces logements dans votre parc de logements.
      </Text>
    </ConfirmationModal>
  );
}

export default GroupRemoveHousingModal;
