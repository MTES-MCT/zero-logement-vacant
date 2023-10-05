import React, { useState } from 'react';
import { HousingOwner, Owner } from '../../../models/Owner';
import { SelectOption } from '../../../models/SelectOption';
import styles from './housing-additional-owner-modal.module.scss';
import HousingAdditionalOwnerSearch from './HousingAdditionalOwnerSearch';
import HousingAdditionalOwnerCreation from './HousingAdditionalOwnerCreation';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Select from '@codegouvfr/react-dsfr/Select';
import Button from '@codegouvfr/react-dsfr/Button';

const modal = createModal({
  id: 'housing-additional-owner-modal',
  isOpenedByDefault: false,
});

interface Props {
  housingId: string;
  activeOwnersCount: number;
  onAddOwner: (housingOwner: HousingOwner) => void;
}

const HousingAdditionalOwnerModal = ({
  housingId,
  activeOwnersCount,
  onAddOwner,
}: Props) => {
  const [additionalOwnerRank, setAdditionalOwnerRank] = useState<string>('1');

  const submitAddingHousingOwner = (owner: Owner) => {
    onAddOwner?.({
      ...owner,
      rank: Number(additionalOwnerRank),
      housingId,
    });
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
    <>
      <Button
        className={styles.addButton}
        priority="secondary"
        iconId="fr-icon-add-line"
        title="Ajouter un propriétaire"
        onClick={modal.open}
      >
        Ajouter un propriétaire
      </Button>
      <modal.Component
        size="large"
        title="Ajout d'un nouveau propriétaire"
        style={{ textAlign: 'initial' }}
      >
        <>
          <Select
            nativeSelectProps={{
              onChange: (e) => setAdditionalOwnerRank(e.target.value),
              value: additionalOwnerRank,
            }}
            label="Sélectionner les droits de propriétés"
            className="fr-pt-2w"
          >
            {ownerRankOptions.map((option) => (
              <option
                key={option.value}
                label={option.label}
                value={option.value}
                disabled={option.disabled}
              ></option>
            ))}
          </Select>
          <hr />
          <div className="fr-py-2w fr-px-6w">
            <HousingAdditionalOwnerSearch onSelect={submitAddingHousingOwner} />

            <div className={styles.separator}>
              <span>ou</span>
            </div>
            <HousingAdditionalOwnerCreation
              onAdd={submitAddingHousingOwner}
              onCancel={modal.close}
            />
          </div>
        </>
      </modal.Component>
    </>
  );
};

export default HousingAdditionalOwnerModal;
