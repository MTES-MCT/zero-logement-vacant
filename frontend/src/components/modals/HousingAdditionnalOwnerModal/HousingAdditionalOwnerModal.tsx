import React, { useState } from 'react';
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalTitle,
  Select,
} from '@dataesr/react-dsfr';
import { HousingOwner, Owner } from '../../../models/Owner';
import { SelectOption } from '../../../models/SelectOption';
import styles from './housing-additional-owner-modal.module.scss';
import HousingAdditionalOwnerSearch from './HousingAdditionalOwnerSearch';
import HousingAdditionalOwnerCreation from './HousingAdditionalOwnerCreation';

interface Props {
  housingId: string;
  activeOwnersCount: number;
  onAddOwner: (housingOwner: HousingOwner) => void;
  onClose: () => void;
}

const HousingAdditionalOwnerModal = ({
  housingId,
  activeOwnersCount,
  onAddOwner,
  onClose,
}: Props) => {
  const [additionalOwnerRank, setAdditionalOwnerRank] = useState<string>('1');

  const submitAddingHousingOwner = (owner: Owner) => {
    onAddOwner?.({
      ...owner,
      rank: Number(additionalOwnerRank),
      housingId,
    });
    onClose();
  };

  const ownerRankOptions: SelectOption[] = [
    { value: '1', label: `Propriétaire principal` },
    ...Array.from(Array(activeOwnersCount).keys()).map((_) => ({
      value: String(_ + 2),
      label: _ + 2 + 'ème ayant droit',
    })),
    { value: '0', label: `Ancien propriétaire` },
  ];

  return (
    <Modal isOpen={true} hide={() => onClose()} size="lg">
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>Ajout d'un nouveau propriétaire</ModalTitle>
      <ModalContent>
        <Select
          label="Sélectionner les droits de propriétés"
          options={ownerRankOptions}
          selected={additionalOwnerRank}
          onChange={(e: any) => setAdditionalOwnerRank(e.target.value)}
          className="fr-pt-2w"
        />
        <hr />
        <div className="fr-py-2w fr-px-6w">
          <HousingAdditionalOwnerSearch onSelect={submitAddingHousingOwner} />

          <div className={styles.separator}>
            <span>ou</span>
          </div>
          <HousingAdditionalOwnerCreation
            onAdd={submitAddingHousingOwner}
            onCancel={onClose}
          />
        </div>
      </ModalContent>
    </Modal>
  );
};

export default HousingAdditionalOwnerModal;
