import { ChangeEvent, useState } from 'react';
import { HousingOwner, Owner } from '../../../models/Owner';
import { SelectOption } from '../../../models/SelectOption';
import styles from './housing-owner-modal.module.scss';
import HousingAdditionalOwnerSearch from './HousingAdditionalOwnerSearch';
import HousingAdditionalOwnerCreation from './HousingAdditionalOwnerCreation';
import Select from '@codegouvfr/react-dsfr/Select';
import Alert from '@codegouvfr/react-dsfr/Alert';

interface Props {
  housingId: string;
  activeOwnersCount: number;
  onAddOwner: (housingOwner: HousingOwner) => void;
}

function HousingAdditionalOwner({ activeOwnersCount, onAddOwner }: Props) {
  const [additionalOwnerRank, setAdditionalOwnerRank] =
    useState<string>('invalid');

  function submitAddingHousingOwner(owner: Owner) {
    onAddOwner?.({
      ...owner,
      rank: Number(additionalOwnerRank),
      idprocpte: null,
      idprodroit: null,
      locprop: null
    });
  }

  const ownerRankOptions: SelectOption[] = [
    { value: '1', label: `Propriétaire principal` },
    ...Array.from(Array(activeOwnersCount).keys()).map((_) => ({
      value: String(_ + 2),
      label: _ + 2 + 'ème ayant droit'
    })),
    { value: '0', label: `Ancien propriétaire` },
    { value: '-1', label: 'Propriétaire incorrect' },
    { value: '-3', label: 'Propriétaire décédé.e' }
  ];

  return (
    <>
      <Select
        nativeSelectProps={{
          onChange: (e: ChangeEvent<HTMLSelectElement>) =>
            setAdditionalOwnerRank(e.target.value),
          value: additionalOwnerRank
        }}
        label="Sélectionner les droits de propriétés"
        className="fr-pt-2w"
      >
        <option value="invalid" disabled></option>
        {ownerRankOptions.map((option) => (
          <option
            key={option.value}
            label={option.label}
            value={option.value}
            disabled={option.disabled}
          ></option>
        ))}
      </Select>
      {additionalOwnerRank === 'invalid' && (
        <Alert
          severity="warning"
          description="Veuillez sélectionner un rang"
          small
        />
      )}
      <hr />
      <div className="fr-py-2w fr-px-6w">
        <HousingAdditionalOwnerSearch onSelect={submitAddingHousingOwner} />

        <div className={styles.separator}>
          <span>ou</span>
        </div>
        <HousingAdditionalOwnerCreation
          onAdd={submitAddingHousingOwner}
          onCancel={() => {}}
          rank={parseInt(additionalOwnerRank)}
        />
      </div>
    </>
  );
}

export default HousingAdditionalOwner;
