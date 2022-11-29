import React from 'react';
import { SelectOption } from '../../models/SelectOption';
import classNames from 'classnames';


const FilterBadge = ({option, filters = [], onChange} : {option: SelectOption, filters: string[] | undefined, onChange?: (_: string[]) => void}) => {
    return (
        <>
            <span className={classNames('fr-tag', 'fr-fi-icon', { 'fr-tag-click': onChange })}>
                {option.badgeLabel ?? option.label}
                {onChange &&
                    <button className="ri-md ri-close-line fr-pr-0"
                            title="Supprimer le filtre"
                            onClick={() => {
                                onChange(filters.filter(v => v !== option.value))
                            }}>
                    </button>
                }
            </span>
        </>
    )
}

const FilterBadges = ({options, filters = [], onChange}: {options: SelectOption[], filters: string[] | undefined, onChange?: (_: string[]) => void}) => {
    return (
        <>
            {options.filter(o => o.value.length && filters.indexOf(o.value) !== -1).map((option, index) =>
                <FilterBadge option={option} filters={filters} onChange={onChange} key={option + '-' + index} />
            )}

            {filters.filter(f => options.map(_ => _.value).indexOf(f) === -1).map((filter, index) =>
                <FilterBadge option={{ value: filter, label: filter }} filters={filters} onChange={onChange} key={filter + '-' + index} />
            )}
        </>
    )
}

export default FilterBadges;

