import React from 'react';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import {
    beneficiaryCountOptions,
    buildingPeriodOptions,
    contactsCountOptions, dataYearsOptions,
    housingAreaOptions,
    roomsCountOptions,
    HousingFilterOption, HousingFilters,
    housingKindOptions,
    housingStateOptions,
    multiOwnerOptions,
    outOfScopeOption,
    ownerAgeOptions,
    ownerKindOptions, taxedOptions,
    vacancyDurationOptions,
} from '../../models/HousingFilters';
import { useCampaignList } from '../../hooks/useCampaignList';

const HousingFilterBadges = ({options, filters, onChange}: {options: HousingFilterOption[], filters: string[], onChange?: (_: string[]) => void}) => {
    return (
        <>
            {options.filter(o => o.value.length && filters?.indexOf(o.value) !== -1).map((option, index) =>
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


const HousingFiltersBadges = ({ filters, onChange }: { filters: HousingFilters, onChange?: (_: any) => void}) => {

    const campaignList = useCampaignList();
    const { establishment } = useSelector((state: ApplicationState) => state.authentication.authUser);

    return (
        <>
            <HousingFilterBadges options={ownerKindOptions}
                          filters={filters.ownerKinds}
                          onChange={onChange && (values => onChange({ownerKinds: values}))}/>
            <HousingFilterBadges options={ownerAgeOptions}
                          filters={filters.ownerAges}
                          onChange={onChange && (values => onChange({ownerAges: values}))}/>
            <HousingFilterBadges options={multiOwnerOptions}
                          filters={filters.multiOwners}
                          onChange={onChange && (values => onChange({multiOwners: values}))}/>
            <HousingFilterBadges options={beneficiaryCountOptions}
                          filters={filters.beneficiaryCounts}
                          onChange={onChange && (values => onChange({beneficiaryCounts: values}))}/>
            <HousingFilterBadges options={housingKindOptions}
                          filters={filters.housingKinds}
                          onChange={onChange && (values => onChange({housingKinds: values}))}/>
            <HousingFilterBadges options={contactsCountOptions}
                          filters={filters.contactsCounts}
                          onChange={onChange && (values => onChange({contactsCounts: values}))}/>
            <HousingFilterBadges options={housingAreaOptions}
                          filters={filters.housingAreas}
                          onChange={onChange && (values => onChange({housingAreas: values}))}/>
            <HousingFilterBadges options={roomsCountOptions}
                          filters={filters.roomsCounts ?? []}
                          onChange={onChange && (values => onChange({roomsCounts: values}))}/>
            <HousingFilterBadges options={housingStateOptions}
                          filters={filters.housingStates}
                          onChange={onChange && (values => onChange({housingStates: values}))}/>
            <HousingFilterBadges options={buildingPeriodOptions}
                          filters={filters.buildingPeriods}
                          onChange={onChange && (values => onChange({buildingPeriods: values}))}/>
            <HousingFilterBadges options={vacancyDurationOptions}
                          filters={filters.vacancyDurations}
                          onChange={onChange && (values => onChange({vacancyDurations: values}))}/>
            <HousingFilterBadges options={taxedOptions}
                          filters={filters.isTaxedValues}
                          onChange={onChange && (values => onChange({isTaxedValues: values}))}/>
            <HousingFilterBadges options={establishment.localities.map(l => ({value: l.geoCode, label: l.name}))}
                          filters={filters.localities}
                          onChange={onChange && (values => onChange({localities: values}))}/>
            {establishment.housingScopes && establishment.housingScopes.scopes &&
                <HousingFilterBadges options={[...establishment.housingScopes.scopes.map(hs => ({value: hs, label: hs})), outOfScopeOption]}
                                     filters={filters.housingScopes.scopes}
                                     onChange={onChange && (values => onChange({housingScopes: {...establishment.housingScopes, scopes: values}}))}/>
            }
            {campaignList && filters.campaignIds &&
                <HousingFilterBadges options={campaignList.map(c => ({value: c.id, label: c.name}))}
                                     filters={filters.campaignIds}
                                     onChange={onChange && (values => onChange({campaignIds: values}))}/>
            }
            <HousingFilterBadges options={dataYearsOptions}
                                 filters={(filters.dataYears?? []).map(_ => String(_))}
                                 onChange={onChange && (values => onChange({dataYears: values}))}/>
            <HousingFilterBadges options={[{value: filters.query, label: filters.query}]}
                          filters={[filters.query]}
                          onChange={onChange && (() => onChange({query: ''}))}/>
        </>
    )

};

export default HousingFiltersBadges;

