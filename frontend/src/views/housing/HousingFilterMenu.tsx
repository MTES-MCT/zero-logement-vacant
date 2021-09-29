import React, { ChangeEvent, useEffect, useState } from 'react';

import { Checkbox, Select, SideMenu, SideMenuItem, TextInput } from '@dataesr/react-dsfr';
import { useDispatch } from 'react-redux';
import { filterHousing } from '../../store/actions/housingAction';
import { HousingFilters } from '../../models/Housing';


const HousingFilterMenu = () => {

    const dispatch = useDispatch();

    const [filters, setFilters] = useState<HousingFilters>({});

    const ownerKindOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "Particulier", label: "Particulier"},
        {value: "Investisseur", label: "Investisseur"},
        {value: "SCI", label: "SCI"},
        {value: "Autres", label: "Autres"}
    ];

    // const ownerAgeOptions = [
    //     {value: "", label: "Sélectionner", disabled: true, hidden: true},
    //     {value: "Particulier", label: "Moins de 35 ans"},
    //     {value: "Investisseur", label: "33 - 65 ans"},
    //     {value: "SCI", label: "plus de 65 ans"},
    //     {value: "Autres", label: "plus de 75 ans"}
    // ];

    const housingKindOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "APPART", label: "Appartement"},
        {value: "MAISON", label: "Maison"}
    ];

    useEffect(() => {
        dispatch(filterHousing(filters));
    }, [filters, dispatch])

    return (
        <SideMenu title="Filtres" buttonLabel="filters" data-testid="filterMenu">
            <SideMenuItem title="Filtres rapides" expandedDefault={true}>
                <Checkbox
                    onChange={(e: ChangeEvent<any>) => setFilters({...filters, individualOwner: e.target.checked})}
                    label="Particulier"
                    data-testid="filter1"
                />
                <Checkbox
                    onChange={(e: ChangeEvent<any>) => setFilters({...filters, multiOwner: e.target.checked})}
                    label="Multipropriétaire"
                    data-testid="filter2"
                />
                <Checkbox
                    onChange={(e: ChangeEvent<any>) => setFilters({...filters, age75: e.target.checked})}
                    label="Plus de 75 ans"
                />
                <Checkbox
                    onChange={(e: ChangeEvent<any>) => setFilters({...filters, beneficiary2: e.target.checked})}
                    label="Plus de 2 ayants droit"
                />
            </SideMenuItem>
            <hr />
            <SideMenuItem title="Propriétaire(s)">
                <Select
                    label="Type"
                    options={ownerKindOptions}
                    selected={filters.ownerKind}
                    onChange={(e: ChangeEvent<any>) => setFilters({...filters, ownerKind: e.target.value})}
                />
                <TextInput
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFilters({...filters, beneficiaryCount: Number(e.target.value)})}
                    label="Nombre d'ayants droit"
                    placeholder="Saisir le nombre"
                />
            </SideMenuItem>
            <hr />
            <SideMenuItem title="Logement">
                <Select
                    label="Type"
                    options={housingKindOptions}
                    selected={filters.housingKind}
                    onChange={(e: ChangeEvent<any>) => setFilters({...filters, housingKind: e.target.value})}
                />
            </SideMenuItem>
        </SideMenu>
    );
};

export default HousingFilterMenu;

