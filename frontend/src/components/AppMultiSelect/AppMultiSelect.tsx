import React, { useRef, useState } from 'react';
import { Checkbox, CheckboxGroup } from '@dataesr/react-dsfr';
import classNames from 'classnames';
import { useOutsideClick } from '../../hooks/useOutsideClick';

const AppMultiSelect = (
    {
        label,
        options,
        initialValues,
        onChange
    }: {
        label: string,
        options: { label: string, value: string }[],
        initialValues: string[],
        onChange: (values: string[]) => void
    }) => {

    const wrapperRef = useRef(null);
    useOutsideClick(wrapperRef, () => setShowOptions(false));

    const [showOptions, setShowOptions] = useState(false);

    const onChangeValue = (value: string, isChecked: boolean) => {
        onChange([
            ...initialValues.filter(v => v !== value),
            ...(isChecked ? [value] : [])
        ]);
    }

    const selectedOptions = () => {
        const maxLength = 28;
        const joinedOptions = options.filter(o => initialValues.indexOf(o.value) !== -1).map(_ => _.label).join(', ')
        return joinedOptions.length ? `${joinedOptions.slice(0, maxLength)}${joinedOptions.length > maxLength ? '...' : ''}` : 'Tous'
    }

    return (
        <div className="select-multi-input" ref={wrapperRef}>
            <span className="fr-label">{label}</span>
            <button className="fr-select"
                    title={showOptions ? 'Masquer les options' : 'Afficher les options'}
                    onClick={() => setShowOptions(!showOptions)}>
                {selectedOptions()}
            </button>
            <div className={classNames('select-multi-options', { 'select-multi-options__visible': showOptions })}>
                <CheckboxGroup legend="" data-testid={`${label.toLowerCase()}-checkbox-group`}>
                    {options.map((option, index) =>
                        <Checkbox
                            label={option.label}
                            onChange={(e: any) => onChangeValue(option.value, e.target.checked)}
                            value={option.value}
                            size="sm"
                            key={label + '-' + index}
                            checked={initialValues.indexOf(option.value) !== -1}
                        />
                    )}
                </CheckboxGroup>
            </div>
        </div>
    );
};

export default AppMultiSelect;

