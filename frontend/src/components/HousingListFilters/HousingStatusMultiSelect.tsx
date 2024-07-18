import { ChangeEvent, useRef, useState } from 'react';
import classNames from 'classnames';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { SelectOption } from '../../models/SelectOption';
import { HousingStatus } from '../../models/HousingState';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import styles from './housing-list-filters.module.scss';
import AppCheckbox from '../_app/AppCheckbox/AppCheckbox';

interface Props {
  selectedStatus?: HousingStatus[];
  options: SelectOption[];
  onChange: (value: HousingStatus, checked: boolean) => void;
  messageType?: string;
  message?: string;
}
const HousingStatusMultiSelect = ({
  selectedStatus,
  options,
  onChange,
  messageType,
  message,
}: Props) => {
  const [showOptions, setShowOptions] = useState(false);

  const wrapperRef = useRef(null);
  useOutsideClick(wrapperRef, () => setShowOptions(false));

  const handleStatusChange = (newStatus: HousingStatus, checked: boolean) => {
    onChange(newStatus, checked);
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
          {selectedStatus !== undefined && selectedStatus.length > 0 ? (
            selectedStatus.map((status) => (
              <HousingStatusBadge status={status} key={status} />
            ))
          ) : (
            <div>Tous</div>
          )}
        </button>
        {message && messageType && (
          <p className={`fr-${messageType}-text`}>{message}</p>
        )}
      </div>
      <div
        className={classNames('select-single-options', 'fr-pt-1w', {
          'select-single-options__visible': showOptions,
        })}
      >
        {options.map((option) => (
          <AppCheckbox
            label={
              <div style={{ marginTop: '-2px', }}>
                <HousingStatusBadge status={Number(option.value)} />
              </div>
            }
            checked={selectedStatus?.includes(Number(option.value))}
            value={option.value}
            className={classNames(
              styles.checkboxLabel,
              'bordered-b',
              'fr-mx-0',
              'fr-pb-1w'
            )}
            hintText={option.hint}
            key={option.label}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleStatusChange(Number(option.value), e.target.checked)
            }
          />
        ))}
      </div>
    </div>
  );
};

export default HousingStatusMultiSelect;
