import classNames from 'classnames';
import React, { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { SelectOption } from '../../../models/SelectOption';
import AppMultiSelectOption from './AppMultiSelectOption';

interface AppMultiSelectProps {
  label: string;
  defaultOption?: string;
  options: SelectOption[];
  initialValues: string[] | undefined;
  onChange: (values: string[]) => void;
  messageType?: string;
  message?: string;
  small?: boolean;
}

const AppMultiSelect = ({
  label,
  defaultOption,
  options,
  initialValues,
  onChange,
  messageType,
  message,
  small,
}: AppMultiSelectProps) => {
  const wrapperRef = useRef(null);
  useOutsideClick(wrapperRef, () => setShowOptions(false));

  const [showOptions, setShowOptions] = useState(false);

  const onChangeValue = (value: string, isChecked: boolean) => {
    onChange([
      ...(initialValues ?? []).filter((v) => v !== value),
      ...(isChecked ? [value] : []),
    ]);
  };

  const selectedOptions = () => {
    const maxLength = 28;
    const joinedOptions = options
      .filter((o) => (initialValues ?? []).indexOf(o.value) !== -1)
      .map((_) => _.label)
      .join(', ');
    return joinedOptions.length
      ? `${joinedOptions.slice(0, maxLength)}${
          joinedOptions.length > maxLength ? '...' : ''
        }`
      : defaultOption ?? 'Tous';
  };

  const id = uuidv4();

  function key(index: number): string {
    return `${label}-${index}`;
  }

  return (
    <>
      {options.length > 0 && (
        <div className="select-multi-input" ref={wrapperRef}>
          <div
            className={classNames({
              [`fr-select-group--${messageType}`]: messageType,
            })}
          >
            <label className="fr-label" htmlFor={id}>
              {label}
            </label>
            <button
              id={id}
              className="fr-select"
              title={
                showOptions ? 'Masquer les options' : 'Afficher les options'
              }
              onClick={() => setShowOptions(!showOptions)}
            >
              {selectedOptions()}
            </button>
            {message && messageType && (
              <p className={`fr-${messageType}-text`}>{message}</p>
            )}
          </div>
          <div
            className={classNames('select-multi-options', {
              'select-multi-options__visible': showOptions,
            })}
          >
            <div data-testid={`${label.toLowerCase()}-checkbox-group`}>
              {options.map(
                (option, index) =>
                  option.markup?.({
                    key: key(index),
                    checked: (initialValues ?? []).includes(option.value),
                    onChangeValue,
                    small,
                  }) ?? (
                    <AppMultiSelectOption
                      {...option}
                      checked={(initialValues ?? []).includes(option.value)}
                      key={key(index)}
                      onChangeValue={onChangeValue}
                      small={small}
                    />
                  )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppMultiSelect;
