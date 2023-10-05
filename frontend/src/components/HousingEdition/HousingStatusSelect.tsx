import React, { useRef, useState } from 'react';
import classNames from 'classnames';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { SelectOption } from '../../models/SelectOption';
import { HousingStatus } from '../../models/HousingState';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import styles from './housing-edition.module.scss';
import { Radio, RadioGroup } from '../_dsfr';

interface Props {
  selected?: HousingStatus;
  options: SelectOption[];
  onChange: (value: HousingStatus) => void;
  messageType?: string;
  message?: string;
}
const HousingStatusSelect = ({
  selected,
  options,
  onChange,
  messageType,
  message,
}: Props) => {
  const [showOptions, setShowOptions] = useState(false);

  const wrapperRef = useRef(null);
  useOutsideClick(wrapperRef, () => setShowOptions(false));

  const handleStatusChange = (newStatus: HousingStatus) => {
    onChange(newStatus);
    setShowOptions(false);
  };

  return (
    <div className="select-single-input" ref={wrapperRef}>
      <div
        className={classNames({
          [`fr-select-group--${messageType}`]: messageType,
        })}
      >
        <label className="fr-label">Statut de suivi</label>
        <button
          className="fr-select"
          title={showOptions ? 'Masquer les options' : 'Afficher les options'}
          onClick={() => setShowOptions(!showOptions)}
        >
          {selected !== undefined ? (
            <HousingStatusBadge status={selected} />
          ) : (
            <div>Sélectionnez un statut de suivi</div>
          )}
        </button>
        {message && messageType && (
          <p className={`fr-${messageType}-text`}>{message}</p>
        )}
      </div>
      <div
        className={classNames('select-single-options', {
          'select-single-options__visible': showOptions,
        })}
      >
        <RadioGroup
          legend=""
          onChange={handleStatusChange}
          value={selected?.toString()}
        >
          {options.map((option) => (
            <Radio
              label={option.label.toUpperCase()}
              value={option.value}
              className={classNames(styles.radioLabel, 'bordered-b', 'fr-p-1w')}
              hint={option.hint}
              key={option.label}
            />
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};

export default HousingStatusSelect;
