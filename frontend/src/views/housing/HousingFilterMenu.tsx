import React, { ChangeEvent, useEffect, useState } from 'react';

import { Checkbox, SideMenu, SideMenuItem } from '@dataesr/react-dsfr';
import { useDispatch } from 'react-redux';
import { filterHousing } from '../../store/actions/housingAction';
import { HousingFilters } from '../../models/Housing';
import { updateWithValue } from '../../utils/arrayUtils';


const HousingFilterMenu = () => {

    const dispatch = useDispatch();

    const [filters, setFilters] = useState<HousingFilters[]>([]);

    useEffect(() => {
        dispatch(filterHousing(filters));
    }, [filters, dispatch])

    return (
        <SideMenu title="Filtres" buttonLabel="filters" data-testid="filterMenu">
            <SideMenuItem title="Filtres rapides" expandedDefault={true}>
                <Checkbox
                    value={HousingFilters.IndividualOwner}
                    onChange={(e: ChangeEvent<any>) => setFilters(updateWithValue(filters, e.target.value, e.target.checked))}
                    label="Particulier"
                    data-testid="filter1"
                />
                <Checkbox
                    value={HousingFilters.MultiOwner}
                    onChange={(e: ChangeEvent<any>) => setFilters(updateWithValue(filters, e.target.value, e.target.checked))}
                    label="Multipropriétaire"
                    data-testid="filter2"
                />
                <Checkbox
                    value={HousingFilters.Age75}
                    onChange={(e: ChangeEvent<any>) => setFilters(updateWithValue(filters, e.target.value, e.target.checked))}
                    label="Plus de 75 ans"
                />
                <Checkbox
                    value={HousingFilters.Beneficiary2}
                    onChange={(e: ChangeEvent<any>) => setFilters(updateWithValue(filters, e.target.value, e.target.checked))}
                    label="Plus de 2 ayants droit"
                />
            </SideMenuItem>
        </SideMenu>
    );
};

export default HousingFilterMenu;

