import React, { useState } from 'react';
import { HousingOwner, Owner } from '../../../models/Owner';
import { SelectOption } from '../../../models/SelectOption';
import styles from './housing-owner-modal.module.scss';
import HousingAdditionalOwnerSearch from './HousingAdditionalOwnerSearch';
import HousingAdditionalOwnerCreation from './HousingAdditionalOwnerCreation';
import Select from '@codegouvfr/react-dsfr/Select';

interface Props {
  housingId: string;
  activeOwnersCount: number;
  onAddOwner: (housingOwner: HousingOwner) => void;
}

const HousingAdditionalOwner = ({
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
          onCancel={() => {}}
        />
      </div>
    </>
  );
};

export default HousingAdditionalOwner;
