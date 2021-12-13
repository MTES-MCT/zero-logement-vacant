import React, { useState } from 'react';

import { Col, Container, Row, Text } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { changeHousingFiltering } from '../../store/actions/housingAction';
import {
    beneficiaryCountOptions,
    buildingPeriodOptions,
    housingAreaOptions,
    housingKindOptions,
    housingStateOptions,
    multiOwnerOptions,
    ownerAgeOptions,
    ownerKindOptions,
    taxedOptions,
    vacancyDurationOptions,
} from '../../models/HousingFilters';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import AppMultiSelect from '../../components/AppMultiSelect/AppMultiSelect';

const HousingListFilter = () => {

    const dispatch = useDispatch();

    const { establishment } = useSelector((state: ApplicationState) => state.authentication.authUser);
    const { filters } = useSelector((state: ApplicationState) => state.housing);
    const [expandFilters, setExpandFilters] = useState<boolean>(false);

    const onChangeFilters = (changedFilters: any) => {
        dispatch(changeHousingFiltering({
            ...filters,
            ...changedFilters
        }))
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
                                        onChange={(values) => onChangeFilters({ownerKinds: values})}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Âge"
                                        options={ownerAgeOptions}
                                        initialValues={filters.ownerAges}
                                        onChange={(values) => onChangeFilters({ownerAges: values})}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Multi-propriété"
                                        options={multiOwnerOptions}
                                        initialValues={filters.multiOwners}
                                        onChange={(values) => onChangeFilters({multiOwners: values})}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Ayants droit"
                                        options={beneficiaryCountOptions}
                                        initialValues={filters.beneficiaryCounts}
                                        onChange={(values) => onChangeFilters({beneficiaryCounts: values})}/>
                    </Col>
                </Row>
            </div>
            {
            <div id="additional-filters" data-testid="additional-filters" className={expandFilters ? 'fr-collapse--expanded' : 'fr-collapse'}>
                <Text size="md" className="fr-mb-1w fr-mt-4w">
                    <b>Logement</b>
                </Text>
                <Row gutters>
                    <Col n="3">
                        <AppMultiSelect label="Type"
                                        options={housingKindOptions}
                                        initialValues={filters.housingKinds}
                                        onChange={(values) => onChangeFilters({housingKinds: values})}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Surface"
                                        options={housingAreaOptions}
                                        initialValues={filters.housingAreas}
                                        onChange={(values) => onChangeFilters({housingAreas: values})}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="État"
                                        options={housingStateOptions}
                                        initialValues={filters.housingStates}
                                        onChange={(values) => onChangeFilters({housingStates: values})}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Date de construction"
                                        options={buildingPeriodOptions}
                                        initialValues={filters.buildingPeriods}
                                        onChange={(values) => onChangeFilters({buildingPeriods: values})}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Durée de vacance"
                                        options={vacancyDurationOptions}
                                        initialValues={filters.vacancyDurations}
                                        onChange={(values) => onChangeFilters({vacancyDurations: values})}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Taxé (THLV ou TLV)"
                                        options={taxedOptions}
                                        initialValues={filters.isTaxedValues}
                                        onChange={(values) => onChangeFilters({isTaxedValues: values})}/>
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
                                        onChange={(values) => onChangeFilters({localities: values})}/>
                    </Col>
                    <Col n="3">
                        <AppMultiSelect label="Périmètre"
                                        options={establishment.housingScopes.map(hs => ({value: hs, label: hs}))}
                                        initialValues={filters.housingScopes}
                                        onChange={(values) => onChangeFilters({housingScopes: values})}/>
                    </Col>
                </Row>
            </div>
            }
            <Row gutters>
                <Col>
                    <button
                        className="ds-fr--inline fr-link float-right fr-mt-4w"
                        type="button"
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

