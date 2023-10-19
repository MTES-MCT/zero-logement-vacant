import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import { Text } from '../../_dsfr';
import { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { Campaign } from '../../../models/Campaign';

interface Props {
  campaigns?: Campaign[];
  openingButtonProps?: Omit<ButtonProps, 'onClick'>;
  onSubmit: () => void;
  onClose?: () => void;
}

function GroupRemovalModal(props: Props) {
  const isRemoving = props.campaigns?.length === 0;
  const title = `Êtes-vous sûr de vouloir ${
    isRemoving ? 'supprimer' : 'archiver'
  } ce groupe ?`;
  return (
    <ConfirmationModal
      modalId="group-removal-modal"
      size="medium"
      title={`${isRemoving ? 'Suppression' : 'Archivage'} du groupe`}
      openingButtonProps={{
        children: `${isRemoving ? 'Supprimer' : 'Archiver'} le groupe`,
        iconId: 'ri-delete-bin-line',
        priority: 'tertiary',
        ...props.openingButtonProps,
      }}
      onSubmit={props.onSubmit}
    >
      <Text>{title}</Text>
    </ConfirmationModal>
  );
}

export default GroupRemovalModal;
