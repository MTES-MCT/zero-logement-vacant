import { useId, useRef, useState } from 'react';
import classNames from 'classnames';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { SelectOption } from '../../models/SelectOption';
import { HousingStatus } from '@zerologementvacant/models';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import RadioButtons from '@codegouvfr/react-dsfr/RadioButtons';

interface Props {
  selected?: HousingStatus;
  options: SelectOption[];
  onChange: (value: HousingStatus) => void;
  messageType?: string;
  message?: string;
}

/**
 * @deprecated Will be replaced by a custom AppSelectNext
 */
const HousingStatusSelect = ({
  selected,
  options,
  onChange,
  messageType,
  message
}: Props) => {
  const [showOptions, setShowOptions] = useState(false);

  const wrapperRef = useRef(null);
  useOutsideClick(wrapperRef, () => setShowOptions(false));

  const handleStatusChange = (newStatus: HousingStatus) => {
    onChange(newStatus);
    setShowOptions(false);
  };

  const inputId = useId();

  return (
    <div className="select-single-input" ref={wrapperRef}>
      <div
        className={classNames({
          [`fr-select-group--${messageType}`]: messageType
        })}
      >
        <label className="fr-label" htmlFor={inputId}>
          Statut de suivi
        </label>
        <button
          className="fr-select"
          id={inputId}
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
          'select-single-options__visible': showOptions
        })}
      >
        <RadioButtons
          className="fr-p-2w radio-button-list"
          options={options.map((option) => ({
            label: <HousingStatusBadge status={Number(option.value)} />,
            hintText: option.hint,
            nativeInputProps: {
              value: option.value,
              checked: Number(option.value) === selected,
              onChange: () => handleStatusChange(Number(option.value))
            }
          }))}
          data-testid="housing-status-options"
        />
      </div>
    </div>
  );
};

export default HousingStatusSelect;
