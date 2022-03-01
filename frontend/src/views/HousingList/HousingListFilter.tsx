import React, { useState } from 'react';

import { Col, Container, Row, Text } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { changeHousingFiltering } from '../../store/actions/housingAction';
import {
    beneficiaryCountOptions,
    buildingPeriodOptions, dataYearsOptions,
    housingAreaOptions,
    roomsCountOptions,
    housingKindOptions,
    housingStateOptions,
    multiOwnerOptions,
    outOfScopeOption,
    ownerAgeOptions,
    ownerKindOptions,
    taxedOptions,
    vacancyDurationOptions,
    localityKindsOptions,
    ownershipKindsOptions,
    campaignsCountOptions, housingCountOptions, vacancyRateOptions,
} from '../../models/HousingFilters';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import AppMultiSelect from '../../components/AppMultiSelect/AppMultiSelect';
import config from '../../utils/config';
import { useMatomo } from '@datapunt/matomo-tracker-react'
import { useCampaignList } from '../../hooks/useCampaignList';


const HousingListFilter = () => {

    const dispatch = useDispatch();
    const { trackEvent } = useMatomo();
    const campaignList = useCampaignList();

    const { establishment } = useSelector((state: ApplicationState) => state.authentication.authUser);
    const { filters } = useSelector((state: ApplicationState) => state.housing);
    const [expandFilters, setExpandFilters] = useState<boolean>(false);

    const onChangeFilters = (changedFilters: any, filterLabel: string) => {
        dispatch(changeHousingFiltering({
            ...filters,
            ...changedFilters
        }))
        trackNewFilter(changedFilters, filterLabel)
    }

    const trackNewFilter = (changedFilters: any, filterLabel: string) => {
        const filterEntry = Object.entries(changedFilters)[0]
        const prevFilterEntry = Object.entries(filters).find(_ => _[0] === filterEntry[0])
        const filterValues = filterEntry[1] as Array<string>
        const prevFilterValues = prevFilterEntry ? prevFilterEntry[1] as Array<string> : []
        const newValues = filterValues.filter(_ => prevFilterValues.indexOf(_) === -1)
        if (newValues.length) {
            trackEvent({ category: 'Filtre', action: `Filtre par ${filterLabel}`, name: newValues.toString(), value: establishment.siren })
        }
    }

    return (
        <Container fluid>
            <div data-testid="owner-filters">
                <Text size="md" className="fr-mb-1w fr-mt-4w">
                    <b>Propriétaire</b>
                </Text>
                <Row gutters>
                    <Col n="3">
                        <AppMultiSelect label="Type"
                                        options={ownerKindOptions}
                                        initialValues={filters.ownerKinds}
                                        onChange={(values) => onChangeFilters({ownerKinds: values}, 'Type')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Âge"
                                        options={ownerAgeOptions}
                                        initialValues={filters.ownerAges}
                                        onChange={(values) => onChangeFilters({ownerAges: values}, 'Âge')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Multi-propriété"
                                        options={multiOwnerOptions}
                                        initialValues={filters.multiOwners}
                                        onChange={(values) => onChangeFilters({multiOwners: values}, 'Multi-propriété')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Ayants droit"
                                        options={beneficiaryCountOptions}
                                        initialValues={filters.beneficiaryCounts}
                                        onChange={(values) => onChangeFilters({beneficiaryCounts: values}, 'Ayants droit')}/>
                    </Col>
                </Row>
            </div>
            <div id="additional-filters" data-testid="additional-filters" className={expandFilters ? 'fr-collapse--expanded' : 'fr-collapse'}>
                <Text size="md" className="fr-mb-1w fr-mt-4w">
                    <b>Logement</b>
                </Text>
                <Row gutters>
                    <Col n="3">
                        <AppMultiSelect label="Type"
                                        options={housingKindOptions}
                                        initialValues={filters.housingKinds}
                                        onChange={(values) => onChangeFilters({housingKinds: values}, 'Type')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Surface"
                                        options={housingAreaOptions}
                                        initialValues={filters.housingAreas}
                                        onChange={(values) => onChangeFilters({housingAreas: values}, 'Surface')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Nombre de pièces"
                                        options={roomsCountOptions}
                                        initialValues={filters.roomsCounts ?? []}
                                        onChange={(values) => onChangeFilters({roomsCounts: values}, 'Nombre de pièces')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="État"
                                        options={housingStateOptions}
                                        initialValues={filters.housingStates}
                                        onChange={(values) => onChangeFilters({housingStates: values}, 'État')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Date de construction"
                                        options={buildingPeriodOptions}
                                        initialValues={filters.buildingPeriods}
                                        onChange={(values) => onChangeFilters({buildingPeriods: values}, 'Date de construction')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label={`Durée de vacance au 01/01/${config.dataYear}`}
                                        options={vacancyDurationOptions}
                                        initialValues={filters.vacancyDurations}
                                        onChange={(values) => onChangeFilters({vacancyDurations: values}, 'Durée de vacance au 01/01/${config.dataYear}')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Taxé (THLV ou TLV)"
                                        options={taxedOptions}
                                        initialValues={filters.isTaxedValues}
                                        onChange={(values) => onChangeFilters({isTaxedValues: values}, 'Taxé (THLV ou TLV)')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Type de propriété"
                                        options={ownershipKindsOptions}
                                        initialValues={filters.ownershipKinds}
                                        onChange={(values) => onChangeFilters({ownershipKinds: values}, 'Type de propriété')}/>
                    </Col>
                </Row>
                <Text size="md" className="fr-mb-1w fr-mt-4w">
                    <b>Immeuble</b>
                </Text>
                <Row gutters>
                    <Col n="3">
                        <AppMultiSelect label="Nombre de logements"
                                        options={housingCountOptions}
                                        initialValues={filters.housingCounts}
                                        onChange={(values) => onChangeFilters({housingCounts: values}, 'Nombre de logements')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Taux de vacance"
                                        options={vacancyRateOptions}
                                        initialValues={filters.vacancyRates}
                                        onChange={(values) => onChangeFilters({vacancyRates: values}, 'Taux de vacance')}/>
                    </Col>
                </Row>
                <Text size="md" className="fr-mb-1w fr-mt-4w">
                    <b>Emplacement</b>
                </Text>
                <Row gutters>
                    <Col n="3">
                        <AppMultiSelect label="Commune"
                                        options={establishment.localities.map(l => ({value: l.geoCode, label: l.name}))}
                                        initialValues={filters.localities}
                                        onChange={(values) => onChangeFilters({localities: values}, 'Commune')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Type de commune"
                                        options={localityKindsOptions}
                                        initialValues={filters.localityKinds}
                                        onChange={(values) => onChangeFilters({localityKinds: values}, 'Type de commune')}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Périmètre"
                                        options={[...establishment.housingScopes.scopes.map(hs => ({value: hs, label: hs})), outOfScopeOption]}
                                        initialValues={filters.housingScopes.scopes}
                                        onChange={(values) => onChangeFilters({housingScopes: {...establishment.housingScopes, scopes: values}}, 'Périmètre')}/>
                    </Col>
                </Row>
                <Text size="md" className="fr-mb-1w fr-mt-4w">
                    <b>Campagnes</b>
                </Text>
                <Row gutters>
                    <Col n="3">
                        <AppMultiSelect label="Prise de contact"
                                        options={campaignsCountOptions}
                                        initialValues={filters.campaignsCounts}
                                        onChange={(values) => onChangeFilters({campaignsCounts: values}, 'Prise de contact')}/>
                    </Col>
                    {campaignList && filters.campaignIds &&
                        <Col n="3">
                            <AppMultiSelect label="Campagne"
                                            options={campaignList.map(c => ({ value: c.id, label: c.name }))}
                                            initialValues={filters.campaignIds}
                                            onChange={(values) => onChangeFilters({ campaignIds: values }, 'Campagne')}/>
                        </Col>
                    }
                    <Col n="3">
                        <AppMultiSelect label="Millésime"
                                        options={dataYearsOptions}
                                        initialValues={(filters.dataYears ?? []).map(_ => String(_))}
                                        onChange={(values) => onChangeFilters({dataYears: values}, 'Millésime')}/>
                    </Col>
                </Row>
            </div>
            <Row gutters>
                <Col>
                    <button
                        className="ds-fr--inline fr-link float-right fr-mt-4w"
                        type="button"
                        title={expandFilters? 'Afficher moins de filtres' : 'Afficher plus de filtres'}
                        aria-controls="additional-filters"
                        aria-expanded={expandFilters}
                        onClick={() => setExpandFilters(!expandFilters)}
                        data-testid="additional-filters-button"
                    >
                        {expandFilters
                            ? <><span className="ri-1x icon-left ri-subtract-line ds-fr--v-middle" />Afficher moins de filtres</>
                            : <><span className="ri-1x icon-left ri-add-line ds-fr--v-middle" />Afficher tous les filtres</>
                        }
                    </button>
                </Col>
            </Row>
        </Container>
    );
};

export default HousingListFilter;

