import React from 'react';
import { SelectOption } from '../../models/SelectOption';

const FilterBadges = ({options, filters = [], onChange}: {options: SelectOption[], filters: string[] | undefined, onChange?: (_: string[]) => void}) => {
    return (
        <>
            {options.filter(o => o.value.length && filters.indexOf(o.value) !== -1).map((option, index) =>
                <span className="fr-tag fr-tag-click fr-tag--sm fr-fi-icon" key={option + '-' + index}>
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
            )}
        </>
    )
}

export default FilterBadges;

