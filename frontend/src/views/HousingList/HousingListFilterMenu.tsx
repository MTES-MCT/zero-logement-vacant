import React, { ChangeEvent, useEffect, useState } from 'react';

import { Checkbox, Select, SideMenu, SideMenuItem, TextInput } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { filterHousing } from '../../store/actions/housingAction';
import { HousingFilters } from '../../models/Housing';
import { ApplicationState } from '../../store/reducers/applicationReducers';


const HousingListFilterMenu = () => {

    const dispatch = useDispatch();

    const { filters } = useSelector((state: ApplicationState) => state.housing);
    const [housingFilters, setHousingFilters] = useState<HousingFilters>(filters ?? {});

    const ownerKindOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "Particulier", label: "Particulier"},
        {value: "Investisseur", label: "Investisseur"},
        {value: "SCI", label: "SCI"},
        {value: "Autres", label: "Autres"}
    ];

    const ownerAgeOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "lt35", label: "Moins de 35 ans"},
        {value: "35to65", label: "35 - 65 ans"},
        {value: "gt65", label: "plus de 65 ans"},
        {value: "gt75", label: "plus de 75 ans"}
    ];

    const housingKindOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "APPART", label: "Appartement"},
        {value: "MAISON", label: "Maison"}
    ];

    const housingStateOptions = [
        {value: "", label: "Sélectionner", disabled: true, hidden: true},
        {value: "Inconfortable", label: "Inconfortable"}
    ];

    useEffect(() => {
        dispatch(filterHousing(housingFilters));
    }, [housingFilters, dispatch])

    return (
        <SideMenu title="Filtres" buttonLabel="filters" data-testid="filterMenu">
            <SideMenuItem title="Filtres rapides" expandedDefault={true}>
                <Checkbox
                    onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, individualOwner: e.target.checked})}
                    label="Particulier"
                    data-testid="filter1"
                    checked={housingFilters.individualOwner}
                />
                <Checkbox
                    onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, multiOwner: e.target.checked})}
                    label="Multipropriétaire"
                    data-testid="filter2"
                    checked={housingFilters.multiOwner}
                />
                <Checkbox
                    onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, ageGt75: e.target.checked})}
                    label="Plus de 75 ans"
                    checked={housingFilters.ageGt75}
                />
                <Checkbox
                    onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, beneficiaryGt2: e.target.checked})}
                    label="Plus de 2 ayants droit"
                    checked={housingFilters.beneficiaryGt2}
                />
            </SideMenuItem>
            <hr />
            <SideMenuItem title="Propriétaire(s)">
                <Select
                    label="Type"
                    options={ownerKindOptions}
                    selected={housingFilters.ownerKind}
                    onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, ownerKind: e.target.value})}
                    value={housingFilters.ownerKind}
                />
                <Select
                    label="Âge"
                    options={ownerAgeOptions}
                    selected={housingFilters.ownerAge}
                    onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, ownerAge: e.target.value})}
                    value={housingFilters.ownerAge}
                />
                <TextInput
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setHousingFilters({...housingFilters, beneficiaryCount: Number(e.target.value)})}
                    label="Nombre d'ayants droit"
                    placeholder="Saisir le nombre"
                    value={housingFilters.beneficiaryCount}
                />
            </SideMenuItem>
            <hr />
            <SideMenuItem title="Logement">
                <Select
                    label="Type"
                    options={housingKindOptions}
                    selected={housingFilters.housingKind}
                    onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, housingKind: e.target.value})}
                    value={housingFilters.housingKind}
                />
                <Select
                    label="État"
                    options={housingStateOptions}
                    selected={housingFilters.housingState}
                    onChange={(e: ChangeEvent<any>) => setHousingFilters({...housingFilters, housingState: e.target.value})}
                    value={housingFilters.housingState}
                />
            </SideMenuItem>
        </SideMenu>
    );
};

export default HousingListFilterMenu;

