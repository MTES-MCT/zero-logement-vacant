import React, { useRef, useState } from 'react';
import { CheckboxGroup } from '@dataesr/react-dsfr';
import classNames from 'classnames';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { SelectOption } from '../../models/SelectOption';
import Checkbox from '../Checkbox/Checkbox';

const AppMultiSelect = (
    {
        label,
        defaultOption,
        options,
        initialValues,
        onChange,
        messageType,
        message
    }: {
        label: string,
        defaultOption?: string,
        options: SelectOption[],
        initialValues: string[] | undefined ,
        onChange: (values: string[]) => void,
        messageType?: string,
        message?: string
    }) => {

    const wrapperRef = useRef(null);
    useOutsideClick(wrapperRef, () => setShowOptions(false));

    const [showOptions, setShowOptions] = useState(false);

    const onChangeValue = (value: string, isChecked: boolean) => {
        onChange([
            ...(initialValues ?? []).filter(v => v !== value),
            ...(isChecked ? [value] : [])
        ]);
    }

    const selectedOptions = () => {
        const maxLength = 28;
        const joinedOptions = options.filter(o => (initialValues ?? []).indexOf(o.value) !== -1).map(_ => _.label).join(', ')
        return joinedOptions.length ? `${joinedOptions.slice(0, maxLength)}${joinedOptions.length > maxLength ? '...' : ''}` : (defaultOption ?? 'Tous')
    }

    return (
        <>
        {options.length > 0 &&
            <div className="select-multi-input" ref={wrapperRef}>
                <div className={classNames({ [`fr-select-group--${messageType}`]: messageType })}>
                    <label className="fr-label">{label}</label>
                    <button className="fr-select"
                            title={showOptions ? 'Masquer les options' : 'Afficher les options'}
                            onClick={() => setShowOptions(!showOptions)}>
                        {selectedOptions()}
                    </button>
                    {(message && messageType) && <p className={`fr-${messageType}-text`}>{message}</p>}
                </div>
                <div
                    className={classNames('select-multi-options', { 'select-multi-options__visible': showOptions })}>
                    <CheckboxGroup legend="" data-testid={`${label.toLowerCase()}-checkbox-group`}>
                        {options.map((option, index) =>
                            option.disabled ?
                                <div className="fr-ml-2w fr-mt-1w" key={label + '-' + index}><b>{option.label}</b>
                                    <hr className="fr-pb-1w"/>
                                </div> :
                                <Checkbox
                                    label={option.label}
                                    onChange={(e: any) => onChangeValue(option.value, e.target.checked)}
                                    value={option.value}
                                    size="sm"
                                    key={label + '-' + index}
                                    checked={(initialValues ?? []).indexOf(option.value) !== -1}
                                />
                        )}
                    </CheckboxGroup>
                </div>
            </div>
        }
        </>
    );
};

export default AppMultiSelect;

